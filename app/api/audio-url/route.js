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
                        '음원 정보를 확인해주세요.'
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
                    audio_path,
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
                'audio-url song error:',
                songError
            );


            return NextResponse.json(
                {
                    error:
                        '음원 정보를 확인하지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        if (
            !song ||
            !song.audio_path
        ) {

            return NextResponse.json(
                {
                    error:
                        '등록된 음원 파일을 찾을 수 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        /*
         * 중요:
         * 화면의 accessible 값을 신뢰하지 않고,
         * signed URL을 발급하기 직전에 서버에서
         * ds_user_program_access를 다시 조회합니다.
         */
        let userPrograms;

        try {

            userPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );

        } catch (error) {

            console.error(
                'audio-url program access error:',
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
                        `${song.program} 수강 회원만 이용할 수 있는 음원입니다.`
                },
                {
                    status: 403
                }
            );

        }


        const {
            data: signedData,
            error: signedError
        } =
            await db
                .storage
                .from(
                    'dear-sunshine-audio'
                )
                .createSignedUrl(
                    song.audio_path,
                    60 * 10
                );


        if (signedError) {

            console.error(
                'audio-url signed URL error:',
                signedError
            );


            return NextResponse.json(
                {
                    error:
                        '음원 주소를 만들지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        return NextResponse.json({
            url:
                signedData.signedUrl
        });


    } catch (error) {

        console.error(
            'audio-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '음원 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );

    }

}
