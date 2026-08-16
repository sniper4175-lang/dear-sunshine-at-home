import {
    NextResponse
} from 'next/server';

import {
    getSongBySlug
} from '../../../lib/content';

import {
    createAdminSupabase
} from '../../../lib/supabase-server';

import {
    getCurrentMembership
} from '../../../lib/membership';

import {
    canAccessSong
} from '../../../lib/content-access';


export async function GET(
    request
) {

    try {

        const {
            searchParams
        } =
            new URL(
                request.url
            );


        const slug =
            searchParams.get(
                'slug'
            );


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


        /*
         * 로그인 사용자와 멤버십 확인
         */
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
                        '이용 가능한 멤버십이 없습니다.'
                },
                {
                    status: 403
                }
            );

        }


        /*
         * 공개된 곡 조회
         */
        const song =
            await getSongBySlug(
                slug
            );


        if (
            !song ||
            !song.audioPath
        ) {

            return NextResponse.json(
                {
                    error:
                        '음원을 찾을 수 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        /*
         * Basic / Premium 실제 이용권한 확인
         */
        if (
            !canAccessSong(
                song,
                membership
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        membership.plan ===
                        'basic'
                            ? 'Basic 멤버십은 최근 3개월 콘텐츠만 이용할 수 있습니다.'
                            : '이 콘텐츠를 이용할 수 없습니다.'
                },
                {
                    status: 403
                }
            );

        }


        /*
         * Private Storage signed URL 발급
         */
        const supabase =
            createAdminSupabase();


        const {
            data,
            error
        } =
            await supabase
                .storage
                .from(
                    'dear-sunshine-audio'
                )
                .createSignedUrl(
                    song.audioPath,
                    1800
                );


        if (error) {

            console.error(
                'audio signed URL error:',
                error
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
                data.signedUrl,

            plan:
                membership.plan
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