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
