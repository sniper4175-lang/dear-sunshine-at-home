/*
 * Private Storage resource helper
 *
 * pathOrFolder can be either:
 * - single file:  Sunshine Toddler/weather-sheet.png
 * - folder:       Sunshine Toddler/excavator-song
 *
 * Folder mode returns every supported file in name order.
 */

const ALLOWED_EXTENSIONS =
    new Set([
        'png',
        'jpg',
        'jpeg',
        'webp',
        'pdf'
    ]);


function extensionOf(
    name
) {

    const value =
        String(
            name || ''
        );


    const index =
        value.lastIndexOf(
            '.'
        );


    if (
        index < 0 ||
        index === value.length - 1
    ) {
        return '';
    }


    return value
        .slice(
            index + 1
        )
        .toLowerCase();
}


export function looksLikeFilePath(
    path
) {

    return ALLOWED_EXTENSIONS.has(
        extensionOf(
            path
        )
    );
}




/*
 * 곡의 Storage 상위 폴더명을 자동 계산합니다.
 * 우선순위:
 * 1) audio_path의 파일명(확장자 제외)
 * 2) DB의 title
 *
 * 예:
 *   audioPath: Melody Book Club/Chugga, Chugga, Choo, Choo!.mp3
 *   => Melody Book Club/Chugga, Chugga, Choo, Choo!
 */
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
        String(title || '').normalize('NFC').trim()
    );

    if (!cleanProgram || !contentTitle) {
        return '';
    }

    return `${cleanProgram}/${contentTitle}`;
}

/*
 * 자동 폴더를 먼저 읽고, 자료가 없을 때만 기존 DB 경로를 fallback으로 사용합니다.
 * 기존 콘텐츠와 새 자동 연결 콘텐츠를 동시에 안전하게 지원하기 위한 함수입니다.
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
            // 폴더가 없거나 조회에 실패한 경우 기존 저장 경로를 시도합니다.
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

export async function createResourceSignedUrls({
    db,
    bucket,
    pathOrFolder,
    expiresIn = 1800
}) {

    const cleanPath =
        String(
            pathOrFolder || ''
        )
            .replace(
                /^\/+/,
                ''
            )
            .replace(
                /\/+$/,
                ''
            )
            .trim();


    if (!cleanPath) {
        return [];
    }


    /*
     * 기존 단일 파일 구조 호환
     */
    if (
        looksLikeFilePath(
            cleanPath
        )
    ) {

        const {
            data,
            error
        } =
            await db
                .storage
                .from(
                    bucket
                )
                .createSignedUrl(
                    cleanPath,
                    expiresIn
                );


        if (error) {
            throw error;
        }


        return [
            {
                name:
                    cleanPath
                        .split('/')
                        .pop(),

                path:
                    cleanPath,

                url:
                    data.signedUrl
            }
        ];

    }


    /*
     * 새 다중 파일 구조:
     * pathOrFolder를 Storage 폴더로 해석
     */
    const {
        data: files,
        error: listError
    } =
        await db
            .storage
            .from(
                bucket
            )
            .list(
                cleanPath,
                {
                    limit: 100,
                    offset: 0,
                    sortBy: {
                        column: 'name',
                        order: 'asc'
                    }
                }
            );


    if (listError) {
        throw listError;
    }


    const candidates =
        (files || [])
            .filter(
                file =>
                    file?.id !== null &&
                    ALLOWED_EXTENSIONS.has(
                        extensionOf(
                            file?.name
                        )
                    )
            )
            .sort(
                (a, b) =>
                    String(
                        a.name || ''
                    )
                        .localeCompare(
                            String(
                                b.name || ''
                            ),
                            undefined,
                            {
                                numeric: true,
                                sensitivity: 'base'
                            }
                        )
            );


    const results =
        [];


    for (
        const file
        of candidates
    ) {

        const fullPath =
            `${cleanPath}/${file.name}`;


        const {
            data,
            error
        } =
            await db
                .storage
                .from(
                    bucket
                )
                .createSignedUrl(
                    fullPath,
                    expiresIn
                );


        if (error) {
            throw error;
        }


        results.push({
            name:
                file.name,

            path:
                fullPath,

            url:
                data.signedUrl
        });

    }


    return results;
}
