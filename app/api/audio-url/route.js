import {
    NextResponse
} from 'next/server';

import {
    createAdminSupabase
} from '../../../lib/supabase-server';

import {
    getCurrentMembership
} from '../../../lib/membership';


export const dynamic =
    'force-dynamic';



function todayKST() {

    return new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone:
                'Asia/Seoul',

            year:
                'numeric',

            month:
                '2-digit',

            day:
                '2-digit'
        }
    ).format(
        new Date()
    );

}



function monthsAgo(
    dateString,
    months
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split('-')
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    date.setUTCMonth(
        date.getUTCMonth() -
        months
    );


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}



/*
 * ==========================================
 * 현재 사용자의 수강 프로그램 조회
 * ==========================================
 */
async function getUserPrograms(
    db,
    userId
) {

    if (!userId) {
        return [];
    }


    const {
        data,
        error
    } =
        await db
            .from(
                'ds_user_program_access'
            )
            .select(
                'program'
            )
            .eq(
                'user_id',
                userId
            );


    if (error) {

        console.error(
            'audio-url program error:',
            {
                message:
                    error?.message,

                code:
                    error?.code,

                details:
                    error?.details,

                hint:
                    error?.hint
            }
        );


        return null;

    }


    return [
        ...new Set(
            (
                data ||
                []
            )
                .map(
                    row =>
                        row.program
                )
                .filter(
                    Boolean
                )
        )
    ];

}



/*
 * ==========================================
 * GET /api/audio-url?slug=...
 * ==========================================
 */
export async function GET(
    request
) {

    try {

        /*
         * ======================================
         * 1. 현재 로그인 사용자 +
         *    유효한 Song Play 멤버십
         * ======================================
         */

        const {
            user,
            membership
        } =
            await getCurrentMembership();


        if (
            !user
        ) {

            return NextResponse.json(
                {
                    error:
                        '로그인이 필요합니다.'
                },
                {
                    status:
                        401
                }
            );

        }


        if (
            !membership
        ) {

            return NextResponse.json(
                {
                    error:
                        '이용 가능한 멤버십이 없습니다.'
                },
                {
                    status:
                        403
                }
            );

        }



        /*
         * ======================================
         * 2. 요청한 곡 slug 확인
         * ======================================
         */

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


        if (
            !slug
        ) {

            return NextResponse.json(
                {
                    error:
                        '음원 정보를 확인해주세요.'
                },
                {
                    status:
                        400
                }
            );

        }



        /*
         * ======================================
         * 3. Admin Supabase
         * ======================================
         */

        const db =
            createAdminSupabase();



        /*
         * ======================================
         * 4. 곡 정보 조회
         * ======================================
         */

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
                    premium_only,
                    release_date,
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


        if (
            songError
        ) {

            console.error(
                'audio-url song error:',
                {
                    message:
                        songError?.message,

                    code:
                        songError?.code,

                    details:
                        songError?.details,

                    hint:
                        songError?.hint
                }
            );


            return NextResponse.json(
                {
                    error:
                        '음원 정보를 확인하지 못했습니다.'
                },
                {
                    status:
                        500
                }
            );

        }


        if (
            !song
        ) {

            return NextResponse.json(
                {
                    error:
                        '존재하지 않는 음원입니다.'
                },
                {
                    status:
                        404
                }
            );

        }


        if (
            !song.audio_path
        ) {

            return NextResponse.json(
                {
                    error:
                        '등록된 음원 파일이 없습니다.'
                },
                {
                    status:
                        404
                }
            );

        }



        /*
         * ======================================
         * 5. 현재 수강 프로그램 조회
         * ======================================
         */

        const userPrograms =
            await getUserPrograms(
                db,
                user.id
            );


        if (
            userPrograms ===
            null
        ) {

            return NextResponse.json(
                {
                    error:
                        '수강 정보를 확인하지 못했습니다.'
                },
                {
                    status:
                        500
                }
            );

        }



        /*
         * ======================================
         * 6. 해당 프로그램 수강 여부 확인
         * ======================================
         */

        if (
            !userPrograms.includes(
                song.program
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        `${song.program} 수강 회원만 이용할 수 있는 음원입니다.`
                },
                {
                    status:
                        403
                }
            );

        }



        /*
         * ======================================
         * 7. Premium
         *
         * 수강 중인 프로그램의
         * 모든 곡 이용 가능
         * ======================================
         */

        if (
            membership.plan ===
            'premium'
        ) {

            /*
             * 추가 제한 없음
             */

        }



        /*
         * ======================================
         * 8. Basic
         *
         * - Premium 전용곡 불가
         * - 최근 3개월 곡만 가능
         * ======================================
         */

        else if (
            membership.plan ===
            'basic'
        ) {

            /*
             * Premium 전용곡
             */
            if (
                song.premium_only
            ) {

                return NextResponse.json(
                    {
                        error:
                            'Premium 전용 음원입니다.'
                    },
                    {
                        status:
                            403
                    }
                );

            }


            /*
             * 공개일 없는 곡
             */
            if (
                !song.release_date
            ) {

                return NextResponse.json(
                    {
                        error:
                            '현재 멤버십으로 이용할 수 없는 음원입니다.'
                    },
                    {
                        status:
                            403
                    }
                );

            }


            const today =
                todayKST();


            const threshold =
                monthsAgo(
                    today,
                    3
                );


            if (
                song.release_date <
                    threshold ||
                song.release_date >
                    today
            ) {

                return NextResponse.json(
                    {
                        error:
                            'Basic 멤버십은 최근 3개월 음원을 이용할 수 있습니다.'
                    },
                    {
                        status:
                            403
                    }
                );

            }

        }



        /*
         * ======================================
         * 9. 알 수 없는 요금제
         * ======================================
         */

        else {

            return NextResponse.json(
                {
                    error:
                        '이용할 수 없는 멤버십입니다.'
                },
                {
                    status:
                        403
                }
            );

        }



        /*
         * ======================================
         * 10. 모든 권한 확인 완료
         *
         * Private Storage에서
         * 10분짜리 signed URL 발급
         * ======================================
         */

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


        if (
            signedError
        ) {

            console.error(
                'audio-url signed URL error:',
                {
                    message:
                        signedError?.message,

                    name:
                        signedError?.name
                }
            );


            return NextResponse.json(
                {
                    error:
                        '음원 주소를 생성하지 못했습니다.'
                },
                {
                    status:
                        500
                }
            );

        }


        if (
            !signedData?.signedUrl
        ) {

            return NextResponse.json(
                {
                    error:
                        '음원 주소를 생성하지 못했습니다.'
                },
                {
                    status:
                        500
                }
            );

        }



        /*
         * ======================================
         * 11. signed URL 반환
         * ======================================
         */

        return NextResponse.json(
            {
                url:
                    signedData.signedUrl
            },
            {
                headers: {
                    'Cache-Control':
                        'private, no-store, max-age=0'
                }
            }
        );


    } catch (error) {

        console.error(
            'GET /api/audio-url error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '음원을 불러오는 중 오류가 발생했습니다.'
            },
            {
                status:
                    500
            }
        );

    }

}