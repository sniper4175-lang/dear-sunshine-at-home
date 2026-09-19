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

export async function createResourceSignedUrls({
    db,
    bucket,
    pathOrFolder,
    expiresIn = 1800
}) {
    const cleanPath = String(pathOrFolder || '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .trim();

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
    const automaticFolder = contentFolderFromSong({
        program,
        audioPath,
        title
    });

    if (automaticFolder) {
        try {
            const automaticItems = await createResourceSignedUrls({
                db,
                bucket,
                pathOrFolder: automaticFolder,
                expiresIn
            });

            if (automaticItems.length > 0) {
                return automaticItems;
            }
        } catch (error) {
            console.warn(
                `[storage-resource] automatic folder failed: ${bucket}/${automaticFolder}`,
                error?.message || error
            );
        }
    }

    const cleanLegacyPath = String(legacyPath || '').trim();

    if (
        cleanLegacyPath &&
        cleanLegacyPath !== automaticFolder
    ) {
        return createResourceSignedUrls({
            db,
            bucket,
            pathOrFolder: cleanLegacyPath,
            expiresIn
        });
    }

    return [];
}
