import {
    randomUUID
} from 'node:crypto';

import {
    NextResponse
} from 'next/server';

import {
    createAdminSupabase
} from '../../../../lib/supabase-server';

import {
    createAuthSupabase
} from '../../../../lib/supabase-auth-server';


export const dynamic =
    'force-dynamic';


const VALID_PLANS = [
    'monthly',
    'sixMonths',
    'twelveMonths'
];


export async function POST(
    request
) {

    try {

        /*
         * 1.
         * 로그인 사용자 확인
         */
        const authSupabase =
            await createAuthSupabase();


        const {
            data: {
                user
            },
            error: userError
        } =
            await authSupabase
                .auth
                .getUser();


        if (
            userError ||
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


        /*
         * 2.
         * 사용자가 선택한 기간권 확인
         */
        const body =
            await request.json();


        const plan =
            String(
                body?.plan ||
                ''
            ).trim();


        if (
            !VALID_PLANS.includes(
                plan
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        '올바르지 않은 멤버십 상품입니다.'
                },
                {
                    status:
                        400
                }
            );

        }


        /*
         * 3.
         * Toss 클라이언트 키 확인
         */
        const clientKey =
            process.env
                .NEXT_PUBLIC_TOSS_CLIENT_KEY;


        if (!clientKey) {

            return NextResponse.json(
                {
                    error:
                        '토스페이먼츠 클라이언트 키가 설정되지 않았습니다.'
                },
                {
                    status:
                        500
                }
            );

        }


        const db =
            createAdminSupabase();


        /*
         * 4.
         * 아직 이용기간이 남아있는
         * Song Club 멤버십이 있는지 확인
         *
         * 자동결제가 아니므로
         * trialing / past_due / paused 등은
         * 더 이상 사용하지 않습니다.
         */
        const {
            data: memberships,
            error: membershipError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    'id,status,current_period_end,ends_at,created_at'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .eq(
                    'status',
                    'active'
                )
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    1
                );


        if (membershipError) {

            throw membershipError;

        }


        const currentMembership =
            memberships?.[0] ||
            null;


        if (currentMembership) {

            const accessUntil =
                currentMembership
                    .current_period_end ||
                currentMembership
                    .ends_at ||
                null;


            /*
             * 종료일이 없거나 아직 미래라면
             * 현재 이용 중인 멤버십으로 봅니다.
             */
            const stillActive =
                !accessUntil ||
                new Date(
                    accessUntil
                ) >
                new Date();


            if (stillActive) {

                return NextResponse.json(
                    {
                        error:
                            '현재 이용 중인 Song Club 멤버십이 있습니다.'
                    },
                    {
                        status:
                            409
                    }
                );

            }

        }


        /*
         * 5.
         * Toss 결제창에서 사용할 customerKey 준비
         *
         * 자동결제용 billingKey를 만드는 것은 아닙니다.
         * Toss가 현재 구매자를 식별하기 위한 값입니다.
         */
        const {
            data: existingProfile,
            error: profileReadError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .select(
                    'id,customer_key'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .eq(
                    'provider',
                    'tosspayments'
                )
                .maybeSingle();


        if (profileReadError) {

            throw profileReadError;

        }


        const customerKey =
            existingProfile
                ?.customer_key ||
            `ds_${randomUUID()}`;


        /*
         * 기존 프로필이 없을 때만 생성
         *
         * billingKey나 카드정보를 저장하지 않습니다.
         */
        if (!existingProfile) {

            const {
                error: insertError
            } =
                await db
                    .from(
                        'ds_billing_profiles'
                    )
                    .insert({
                        user_id:
                            user.id,

                        provider:
                            'tosspayments',

                        customer_key:
                            customerKey,

                        is_active:
                            false
                    });


            if (insertError) {

                throw insertError;

            }

        }


        /*
         * 6.
         * 브라우저에 결제창을 열기 위해 필요한 값만 반환
         */
        return NextResponse.json({

            ok:
                true,

            clientKey,

            customerKey,

            customerEmail:
                user.email ||
                '',

            plan

        });


    } catch (error) {

        console.error(
            'payment prepare error:',
            {
                message:
                    error?.message,

                code:
                    error?.code
            }
        );


        return NextResponse.json(
            {
                error:
                    error?.message ||
                    '결제를 준비하지 못했습니다.'
            },
            {
                status:
                    500
            }
        );

    }

}