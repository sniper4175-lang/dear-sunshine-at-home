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
         * 로그인 + 멤버십 확인
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
         * 공개 콘텐츠 조회
         */
        const song =
            await getSongBySlug(
                slug
            );


        if (
            !song ||
            !song.printablePath
        ) {

            return NextResponse.json(
                {
                    error:
                        '활동지를 찾을 수 없습니다.'
                },
                {
                    status: 404
                }
            );

        }


        /*
         * Basic / Premium 권한 확인
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
                            ? 'Basic 멤버십에서는 이 활동지를 이용할 수 없습니다.'
                            : '이 활동지를 이용할 수 없습니다.'
                },
                {
                    status: 403
                }
            );

        }


        const supabase =
            createAdminSupabase();


        /*
         * 30분 signed URL
         */
        const {
            data,
            error
        } =
            await supabase
                .storage
                .from(
                    'dear-sunshine-printables'
                )
                .createSignedUrl(
                    song.printablePath,
                    1800
                );


        if (error) {

            console.error(
                'printable signed URL error:',
                error
            );


            return NextResponse.json(
                {
                    error:
                        '활동지 주소를 만들지 못했습니다.'
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
            'printable-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '활동지 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );

    }

}