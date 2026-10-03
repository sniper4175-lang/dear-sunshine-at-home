/*
 * Private Storage resource helper
 *
 * Performance goals:
 * - Folder listing is cached briefly in a warm server process.
 * - Multiple files are signed with createSignedUrls() in one request when possible.
 * - Fallback signing is parallel, never sequential.
 */

const ALLOWED_EXTENSIONS = new Set([
    'png',
    'jpg',
    'jpeg',
    'webp',
    'gif',
    'avif',
    'pdf'
]);

const FOLDER_CACHE_TTL_MS = 60 * 1000;

/*
 * globalThis를 사용하면 Vercel의 warm instance 안에서
 * 같은 폴더 목록을 잠깐 재사용할 수 있습니다.
 */
const folderCache =
    globalThis.__dearSunshineStorageFolderCache ||
    new Map();

globalThis.__dearSunshineStorageFolderCache = folderCache;


function normalizeStoragePath(pathOrUrl, bucket) {
    let value = String(pathOrUrl || '').trim();

    if (!value) {
        return '';
    }

    /*
     * 관리자 DB에는 과거 버전에 따라
     * - bucket 내부 상대경로
     * - bucket명/상대경로
     * - Supabase Storage 전체 URL
     * 형태가 섞여 있을 수 있습니다.
     * 음원앱에서는 모두 bucket 내부 상대경로로 통일해서 처리합니다.
     */
    try {
        if (/^https?:\/\//i.test(value)) {
            const url = new URL(value);
            value = url.pathname || '';
        }
    } catch {
        // URL 파싱이 안 되면 원래 문자열을 그대로 사용합니다.
    }

    try {
        value = decodeURIComponent(value);
    } catch {
        // 이미 디코딩된 문자열이면 그대로 사용합니다.
    }

    value = value
        .split('?')[0]
        .split('#')[0]
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .trim();

    const cleanBucket = String(bucket || '')
        .replace(/^\/+|\/+$/g, '')
        .trim();

    if (!cleanBucket) {
        return value;
    }

    const markerPatterns = [
        `storage/v1/object/public/${cleanBucket}/`,
        `storage/v1/object/sign/${cleanBucket}/`,
        `storage/v1/object/authenticated/${cleanBucket}/`,
        `storage/v1/object/${cleanBucket}/`,
        `${cleanBucket}/`
    ];

    for (const marker of markerPatterns) {
        const index = value.indexOf(marker);

        if (index >= 0) {
            value = value.slice(index + marker.length);
            break;
        }
    }

    return value
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .trim();
}

function extensionOf(name) {
    const value = String(name || '');
    const index = value.lastIndexOf('.');

    if (
        index < 0 ||
        index === value.length - 1
    ) {
        return '';
    }

    return value
        .slice(index + 1)
        .toLowerCase();
}

export function looksLikeFilePath(path) {
    return ALLOWED_EXTENSIONS.has(
        extensionOf(path)
    );
}

export function contentFolderFromSong({
    program,
    audioPath,
    title
}) {
    const cleanProgram = String(program || '').trim();

    const audioName = String(audioPath || '')
        .split('/')
        .pop()
        ?.trim() || '';

    const audioTitle = audioName
        .replace(/\.[^/.]+$/, '')
        .normalize('NFC')
        .trim();

    const contentTitle = (
        audioTitle ||
        String(title || '')
            .normalize('NFC')
            .trim()
    );

    if (!cleanProgram || !contentTitle) {
        return '';
    }

    return `${cleanProgram}/${contentTitle}`;
}


/*
 * Storage의 자료 폴더 이름은 과거 등록 방식에 따라
 * - 음원 파일명 기준
 * - 콘텐츠 제목 기준
 * - 쉼표/느낌표 등 문장부호 제거 버전
 * 으로 섞여 있을 수 있습니다.
 *
 * 예:
 *   audio: Chugga Chugga Choo Choo.mp3
 *   title: Chugga, Chugga, Choo, Choo!
 *
 * 이전 코드는 audio 파일명이 있으면 title 후보를 전혀 시도하지 않아
 * 관리자에서는 자료가 연결되어 보여도 음원앱에서는 자료가 0개로
 * 보일 수 있었습니다.
 */
function resourceTitleVariants(value) {
    const exact = String(value || '')
        .normalize('NFC')
        .trim();

    if (!exact) {
        return [];
    }

    const compactWhitespace = exact
        .replace(/\s+/g, ' ')
        .trim();

    const punctuationLoose = compactWhitespace
        .replace(/[\u2018\u2019\u201C\u201D'"`´,，、.!！?？:：;；()[\]{}<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const dashLoose = punctuationLoose
        .replace(/[\-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return Array.from(
        new Set(
            [
                exact,
                compactWhitespace,
                punctuationLoose,
                dashLoose
            ].filter(Boolean)
        )
    );
}

function songResourceFolderCandidates({
    program,
    audioPath,
    title
}) {
    const cleanProgram = String(program || '').trim();

    const audioName = String(audioPath || '')
        .split('/')
        .pop()
        ?.trim() || '';

    const audioTitle = audioName
        .replace(/\.[^/.]+$/, '')
        .normalize('NFC')
        .trim();

    const titleVariants = Array.from(
        new Set([
            ...resourceTitleVariants(audioTitle),
            ...resourceTitleVariants(title)
        ])
    );

    const folders = [];

    for (const key of titleVariants) {
        if (cleanProgram) {
            folders.push(`${cleanProgram}/${key}`);
        }

        folders.push(key);
    }

    return Array.from(
        new Set(
            folders
                .map((value) => String(value || '').trim())
                .filter(Boolean)
        )
    );
}

function normalizeSignedUrlRow(row) {
    return String(
        row?.signedUrl ||
        row?.signedURL ||
        ''
    );
}

async function signPaths({
    db,
    bucket,
    files,
    expiresIn
}) {
    if (!Array.isArray(files) || files.length === 0) {
        return [];
    }

    const storage = db.storage.from(bucket);
    const paths = files.map((file) => file.path);

    /*
     * Supabase JS v2는 여러 파일을 한 번에 서명할 수 있습니다.
     * 파일마다 createSignedUrl()을 순차 호출하던 구조보다 훨씬 빠릅니다.
     */
    if (typeof storage.createSignedUrls === 'function') {
        try {
            const {
                data,
                error
            } = await storage.createSignedUrls(
                paths,
                expiresIn
            );

            if (!error && Array.isArray(data)) {
                const byPath = new Map();

                for (const row of data) {
                    const path = String(row?.path || '');
                    const signedUrl = normalizeSignedUrlRow(row);

                    if (path && signedUrl) {
                        byPath.set(path, signedUrl);
                    }
                }

                const result = files
                    .map((file) => {
                        const url = byPath.get(file.path);

                        return url
                            ? {
                                ...file,
                                url
                            }
                            : null;
                    })
                    .filter(Boolean);

                if (result.length === files.length) {
                    return result;
                }
            }
        } catch (error) {
            console.warn(
                `[storage-resource] batch signing fallback: ${bucket}`,
                error?.message || error
            );
        }
    }

    /*
     * SDK/환경에 따라 다중 서명이 안 되는 경우에도
     * 개별 서명을 병렬 실행합니다.
     */
    const result = await Promise.all(
        files.map(async (file) => {
            const {
                data,
                error
            } = await storage.createSignedUrl(
                file.path,
                expiresIn
            );

            if (error || !data?.signedUrl) {
                return null;
            }

            return {
                ...file,
                url: data.signedUrl
            };
        })
    );

    return result.filter(Boolean);
}

async function listFolderFiles({
    db,
    bucket,
    folder
}) {
    const cacheKey = `${bucket}::${folder}`;
    const cached = folderCache.get(cacheKey);

    if (
        cached &&
        cached.expiresAt > Date.now() &&
        Array.isArray(cached.files)
    ) {
        return cached.files;
    }

    const storage = db.storage.from(bucket);

    const {
        data: files,
        error
    } = await storage.list(
        folder,
        {
            limit: 100,
            offset: 0,
            sortBy: {
                column: 'name',
                order: 'asc'
            }
        }
    );

    if (error) {
        throw error;
    }

    const candidates = (files || [])
        .filter(
            (file) =>
                file?.id !== null &&
                ALLOWED_EXTENSIONS.has(
                    extensionOf(file?.name)
                )
        )
        .sort(
            (a, b) =>
                String(a.name || '')
                    .localeCompare(
                        String(b.name || ''),
                        undefined,
                        {
                            numeric: true,
                            sensitivity: 'base'
                        }
                    )
        )
        .map((file) => ({
            name: file.name,
            path: `${folder}/${file.name}`
        }));

    folderCache.set(
        cacheKey,
        {
            expiresAt: Date.now() + FOLDER_CACHE_TTL_MS,
            files: candidates
        }
    );

    return candidates;
}


/*
 * Signed URL을 브라우저에 노출하지 않고 Dear Sunshine 도메인으로
 * 프록시할 때 사용할 수 있도록 파일 목록만 반환합니다.
 */
export async function listResourceFiles({
    db,
    bucket,
    pathOrFolder
}) {
    const cleanPath = normalizeStoragePath(
        pathOrFolder,
        bucket
    );

    if (!cleanPath) {
        return [];
    }

    if (looksLikeFilePath(cleanPath)) {
        return [
            {
                name: cleanPath.split('/').pop(),
                path: cleanPath
            }
        ];
    }

    return listFolderFiles({
        db,
        bucket,
        folder: cleanPath
    });
}

/*
 * 자동 폴더를 먼저 찾고, 없을 때만 예전 DB 경로를 사용합니다.
 * URL은 만들지 않기 때문에 Supabase 주소가 브라우저 HTML에 포함되지 않습니다.
 */
export async function listSongResourceFiles({
    db,
    bucket,
    program,
    audioPath,
    title,
    legacyPath
}) {
    const automaticFolders = songResourceFolderCandidates({
        program,
        audioPath,
        title
    });

    /*
     * 관리자 앱과 동일하게 여러 폴더 이름 후보를 확인합니다.
     * 특히 음원 파일명과 곡 제목의 문장부호가 다른 경우도 처리합니다.
     */

    /*
     * DB에서 관리자가 직접 연결한 경로가 있으면 가장 우선합니다.
     */
    const cleanLegacyPath = normalizeStoragePath(
        legacyPath,
        bucket
    );

    if (cleanLegacyPath) {
        try {
            const linkedItems = await listResourceFiles({
                db,
                bucket,
                pathOrFolder: cleanLegacyPath
            });

            if (linkedItems.length > 0) {
                return linkedItems;
            }
        } catch (error) {
            console.warn(
                `[storage-resource] linked path list failed: ${bucket}/${cleanLegacyPath}`,
                error?.message || error
            );
        }
    }

    const foldersToTry = automaticFolders
        .filter((value) => value !== cleanLegacyPath);

    for (const folder of foldersToTry) {
        try {
            const automaticItems = await listResourceFiles({
                db,
                bucket,
                pathOrFolder: folder
            });

            if (automaticItems.length > 0) {
                return automaticItems;
            }
        } catch (error) {
            console.warn(
                `[storage-resource] automatic folder list failed: ${bucket}/${folder}`,
                error?.message || error
            );
        }
    }

    return [];
}

export async function createResourceSignedUrls({
    db,
    bucket,
    pathOrFolder,
    expiresIn = 1800
}) {
    const cleanPath = normalizeStoragePath(
        pathOrFolder,
        bucket
    );

    if (!cleanPath) {
        return [];
    }

    const storage = db.storage.from(bucket);

    /* 기존 단일 파일 구조 호환 */
    if (looksLikeFilePath(cleanPath)) {
        const {
            data,
            error
        } = await storage.createSignedUrl(
            cleanPath,
            expiresIn
        );

        if (error || !data?.signedUrl) {
            throw error || new Error('SIGNED_URL_NOT_CREATED');
        }

        return [
            {
                name: cleanPath.split('/').pop(),
                path: cleanPath,
                url: data.signedUrl
            }
        ];
    }

    const files = await listFolderFiles({
        db,
        bucket,
        folder: cleanPath
    });

    return signPaths({
        db,
        bucket,
        files,
        expiresIn
    });
}

/*
 * 자동 폴더를 먼저 읽고 자료가 없을 때만
 * 예전 DB 경로를 fallback으로 사용합니다.
 */
export async function createSongResourceSignedUrls({
    db,
    bucket,
    program,
    audioPath,
    title,
    legacyPath,
    expiresIn = 1800
}) {
    const automaticFolders = songResourceFolderCandidates({
        program,
        audioPath,
        title
    });

    const cleanLegacyPath = normalizeStoragePath(
        legacyPath,
        bucket
    );

    if (cleanLegacyPath) {
        try {
            const linkedItems = await createResourceSignedUrls({
                db,
                bucket,
                pathOrFolder: cleanLegacyPath,
                expiresIn
            });

            if (linkedItems.length > 0) {
                return linkedItems;
            }
        } catch (error) {
            console.warn(
                `[storage-resource] linked path failed: ${bucket}/${cleanLegacyPath}`,
                error?.message || error
            );
        }
    }

    const foldersToTry = automaticFolders
        .filter((value) => value !== cleanLegacyPath);

    for (const folder of foldersToTry) {
        try {
            const automaticItems = await createResourceSignedUrls({
                db,
                bucket,
                pathOrFolder: folder,
                expiresIn
            });

            if (automaticItems.length > 0) {
                return automaticItems;
            }
        } catch (error) {
            console.warn(
                `[storage-resource] automatic folder failed: ${bucket}/${folder}`,
                error?.message || error
            );
        }
    }

    return [];
}
