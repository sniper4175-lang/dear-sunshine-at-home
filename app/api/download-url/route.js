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
         * 로그인 및 멤버십 확인
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
         * 다운로드는 Premium만 허용
         */
        if (
            membership.plan !==
            'premium'
        ) {

            return NextResponse.json(
                {
                    error:
                        '음원 다운로드는 Premium 멤버십에서 이용할 수 있습니다.'
                },
                {
                    status: 403
                }
            );

        }


        /*
         * 공개 곡 조회
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


        const supabase =
            createAdminSupabase();


        /*
         * 다운로드용 signed URL
         *
         * 300초 = 5분
         */
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
                    300,
                    {
                        download:
                            true
                    }
                );


        if (error) {

            console.error(
                'download signed URL error:',
                error
            );


            return NextResponse.json(
                {
                    error:
                        '다운로드 주소를 만들지 못했습니다.'
                },
                {
                    status: 500
                }
            );

        }


        return NextResponse.json({
            url:
                data.signedUrl
        });


    } catch (error) {

        console.error(
            'download-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '다운로드 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );

    }

}