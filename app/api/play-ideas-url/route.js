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
                    play_ideas_path,
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
                'play-ideas-url song error:',
                songError
            );


            return NextResponse.json(
                {
                    error:
                        'Play Ideas 정보를 확인하지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        if (
            !song ||
            !song.play_ideas_path
        ) {

            return NextResponse.json(
                {
                    error:
                        '등록된 Play Ideas가 없습니다.'
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
                'play-ideas-url program access error:',
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
                        `${song.program} 수강 회원만 이용할 수 있는 Play Ideas입니다.`
                },
                {
                    status: 403
                }
            );

        }


        const items =
            await createResourceSignedUrls({
                db,
                bucket:
                    'dear-sunshine-play-ideas',

                pathOrFolder:
                    song.play_ideas_path,

                expiresIn:
                    60 * 30
            });


        if (
            items.length === 0
        ) {

            return NextResponse.json(
                {
                    error:
                        '등록된 Play Ideas 파일이 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        return NextResponse.json({
            /*
             * 새 다중파일 구조
             */
            items,

            /*
             * 기존 단일파일 클라이언트 호환
             */
            url:
                items[0]?.url ||
                null
        });


    } catch (error) {

        console.error(
            'play-ideas-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    'Play Ideas 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );

    }

}
