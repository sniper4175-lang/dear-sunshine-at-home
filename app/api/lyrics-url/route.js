import {
    NextResponse
} from 'next/server';

import {
    createAdminSupabase
} from '../../../lib/supabase-server';

import {
    getCurrentMembership
} from '../../../lib/membership';

import {
    getUserPrograms
} from '../../../lib/program-access';

import {
    canAccessSong
} from '../../../lib/content-access';

import {
    createResourceSignedUrls
} from '../../../lib/storage-resource';


export const dynamic =
    'force-dynamic';


function isExamplePath(
    value
) {

    return String(
        value || ''
    )
        .toLowerCase()
        .endsWith(
            '/example.png'
        ) ||
        String(
            value || ''
        )
            .toLowerCase() ===
            'example.png';

}


export async function GET(
    request
) {

    try {

        const {
            user,
            membership
        } =
            await getCurrentMembership();


        if (!user) {

            return NextResponse.json(
                {
                    error:
                        '로그인이 필요합니다.'
                },
                {
                    status: 401
                }
            );

        }


        if (!membership) {

            return NextResponse.json(
                {
                    error:
                        '이용 가능한 Song Club 멤버십이 없습니다.'
                },
                {
                    status: 403
                }
            );

        }


        const {
            searchParams
        } =
            new URL(
                request.url
            );


        const slug =
            String(
                searchParams.get(
                    'slug'
                ) ||
                ''
            ).trim();


        if (!slug) {

            return NextResponse.json(
                {
                    error:
                        '곡 정보가 없습니다.'
                },
                {
                    status: 400
                }
            );

        }


        const db =
            createAdminSupabase();


        const {
            data: song,
            error: songError
        } =
            await db
                .from(
                    'ds_content_songs'
                )
                .select(
                    `
                    slug,
                    title,
                    program,
                    lyrics_path,
                    is_published
                    `
                )
                .eq(
                    'slug',
                    slug
                )
                .eq(
                    'is_published',
                    true
                )
                .maybeSingle();


        if (songError) {

            console.error(
                'lyrics-url song error:',
                songError
            );


            return NextResponse.json(
                {
                    error:
                        '가사지 정보를 확인하지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        if (!song) {

            return NextResponse.json(
                {
                    error:
                        '곡 정보를 찾을 수 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        let userPrograms;

        try {

            userPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );

        } catch (error) {

            console.error(
                'lyrics-url program access error:',
                error
            );


            return NextResponse.json(
                {
                    error:
                        '수강 프로그램 권한을 확인하지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        if (
            !canAccessSong(
                {
                    program:
                        song.program
                },
                membership,
                userPrograms
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        `${song.program} 수강 회원만 이용할 수 있는 가사지입니다.`
                },
                {
                    status: 403
                }
            );

        }


        /*
         * 1) 정상적인 lyrics_path가 있으면 그대로 사용
         * 2) null 또는 예전 example.png이면 자동 폴더 경로 사용
         *
         * 예:
         * Sunshine Toddler/Excavator Song
         * Melody Book Club/Color Monster
         */
        const resourcePath =
            song.lyrics_path &&
            !isExamplePath(
                song.lyrics_path
            )
                ? song.lyrics_path
                : `${song.program}/${song.title}`;


        let items =
            [];


        try {

            items =
                await createResourceSignedUrls({
                    db,
                    bucket:
                        'dear-sunshine-lyrics',

                    pathOrFolder:
                        resourcePath,

                    expiresIn:
                        60 * 30
                });

        } catch (error) {

            console.error(
                'lyrics-url storage error:',
                error
            );


            return NextResponse.json(
                {
                    error:
                        '가사지 파일을 확인하지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        /*
         * 폴더가 없거나 파일이 없으면 404.
         * 클라이언트는 404일 때 가사지 영역 자체를 숨깁니다.
         */
        if (
            items.length === 0
        ) {

            return NextResponse.json(
                {
                    error:
                        '등록된 가사지가 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        return NextResponse.json({
            items,

            /*
             * 기존 단일 가사지 코드 호환
             */
            url:
                items[0]?.url ||
                null
        });


    } catch (error) {

        console.error(
            'lyrics-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '가사지 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );

    }

}
