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


/*
 * 실제 판매 상품.
 *
 * 금액과 이용기간은 브라우저에서 받은 값을
 * 그대로 믿지 않고 서버가 다시 결정합니다.
 */
const PLAN_CONFIG = {

    monthly: {
        amount: 12900,
        months: 1,
        label: '1개월 이용권'
    },

    sixMonths: {
        amount: 73500,
        months: 6,
        label: '6개월 이용권'
    },

    twelveMonths: {
        amount: 139000,
        months: 12,
        label: '12개월 이용권'
    }

};


/*
 * MembershipPaymentButton에서 만들어지는
 * orderId:
 *
 * sunshine_monthly_xxxxx
 * sunshine_sixMonths_xxxxx
 * sunshine_twelveMonths_xxxxx
 *
 * 여기서 상품 종류를 다시 읽습니다.
 */
function getPlanFromOrderId(
    orderId
) {

    if (
        orderId.startsWith(
            'sunshine_monthly_'
        )
    ) {
        return 'monthly';
    }


    if (
        orderId.startsWith(
            'sunshine_sixMonths_'
        )
    ) {
        return 'sixMonths';
    }


    if (
        orderId.startsWith(
            'sunshine_twelveMonths_'
        )
    ) {
        return 'twelveMonths';
    }


    return null;

}


/*
 * 1개월 / 6개월 / 12개월을
 * 달력 기준으로 더합니다.
 *
 * 예:
 * 9월 12일 + 1개월
 * → 10월 12일
 */
function addMonths(
    date,
    months
) {

    const result =
        new Date(
            date
        );


    const originalDay =
        result.getUTCDate();


    /*
     * 우선 해당 월의 1일로 이동한 뒤
     * 월을 더해야 31일 때문에
     * 다음 달로 밀리는 현상을 막을 수 있습니다.
     */
    result.setUTCDate(
        1
    );


    result.setUTCMonth(
        result.getUTCMonth() +
        months
    );


    /*
     * 이동한 달의 마지막 날짜 확인
     */
    const lastDayOfMonth =
        new Date(
            Date.UTC(
                result.getUTCFullYear(),
                result.getUTCMonth() + 1,
                0
            )
        )
            .getUTCDate();


    result.setUTCDate(
        Math.min(
            originalDay,
            lastDayOfMonth
        )
    );


    return result;

}


/*
 * Toss Payments 일반결제 승인
 */
async function confirmTossPayment({
    paymentKey,
    orderId,
    amount
}) {

    const secretKey =
        process.env
            .TOSS_SECRET_KEY;


    if (!secretKey) {

        throw new Error(
            'TOSS_SECRET_KEY가 설정되지 않았습니다.'
        );

    }


    /*
     * Toss Basic Authorization
     * secretKey 뒤에 : 를 붙여 Base64 인코딩
     */
    const authorization =
        Buffer
            .from(
                `${secretKey}:`
            )
            .toString(
                'base64'
            );


    const response =
        await fetch(
            'https://api.tosspayments.com/v1/payments/confirm',
            {
                method:
                    'POST',

                headers: {
                    Authorization:
                        `Basic ${authorization}`,

                    'Content-Type':
                        'application/json',

                    /*
                     * 같은 orderId로 요청이 재전송되더라도
                     * 동일 승인 요청으로 처리하도록 합니다.
                     */
                    'Idempotency-Key':
                        `dear-sunshine-${orderId}`
                },

                body:
                    JSON.stringify({
                        paymentKey,
                        orderId,
                        amount
                    }),

                cache:
                    'no-store'
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        const error =
            new Error(
                data?.message ||
                '토스페이먼츠 결제 승인에 실패했습니다.'
            );


        error.code =
            data?.code;


        error.status =
            response.status;


        throw error;

    }


    return data;

}


/*
 * 결제는 승인됐는데 멤버십 DB 저장에 실패한 경우
 * 사용자가 돈만 내고 이용권을 못 받는 일을 줄이기 위해
 * 승인된 결제를 취소합니다.
 */
async function cancelTossPayment(
    paymentKey
) {

    try {

        const secretKey =
            process.env
                .TOSS_SECRET_KEY;


        if (!secretKey) {
            return;
        }


        const authorization =
            Buffer
                .from(
                    `${secretKey}:`
                )
                .toString(
                    'base64'
                );


        await fetch(
            `https://api.tosspayments.com/v1/payments/${encodeURIComponent(
                paymentKey
            )}/cancel`,
            {
                method:
                    'POST',

                headers: {
                    Authorization:
                        `Basic ${authorization}`,

                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        cancelReason:
                            '멤버십 활성화 실패로 인한 자동 취소'
                    }),

                cache:
                    'no-store'
            }
        );


    } catch (error) {

        console.error(
            'payment rollback error:',
            error
        );

    }

}


export async function POST(
    request
) {

    let approvedPayment =
        null;


    try {

        /*
         * 1.
         * 현재 로그인 사용자 확인
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
         * 결제 성공 페이지에서 넘어온 정보
         */
        const body =
            await request.json();


        const paymentKey =
            String(
                body?.paymentKey ||
                ''
            ).trim();


        const orderId =
            String(
                body?.orderId ||
                ''
            ).trim();


        const amount =
            Number(
                body?.amount
            );


        if (
            !paymentKey ||
            !orderId ||
            !Number.isFinite(
                amount
            )
        ) {

            return NextResponse.json(
                {
                    error:
                        '결제 정보가 올바르지 않습니다.'
                },
                {
                    status:
                        400
                }
            );

        }


        /*
         * 3.
         * orderId를 보고 어떤 이용권인지
         * 서버가 직접 판단
         */
        const plan =
            getPlanFromOrderId(
                orderId
            );


        const planConfig =
            plan
                ? PLAN_CONFIG[
                    plan
                ]
                : null;


        if (!planConfig) {

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
         * 4.
         * 서버에서 금액 재검증
         *
         * 예:
         * monthly라면 무조건 12,900원이어야 합니다.
         */
        if (
            amount !==
            planConfig.amount
        ) {

            console.error(
                'payment amount mismatch:',
                {
                    orderId,
                    received:
                        amount,
                    expected:
                        planConfig.amount
                }
            );


            return NextResponse.json(
                {
                    error:
                        '결제 금액이 올바르지 않습니다.'
                },
                {
                    status:
                        400
                }
            );

        }


        const db =
            createAdminSupabase();


        /*
         * 5.
         * 이미 이용 중인 멤버십이 있는지 확인
         *
         * 현재 앱에서는 이용 중인 상태에서
         * 추가 기간권 구매를 허용하지 않습니다.
         */
        const now =
            new Date();


        const {
            data: activeMemberships,
            error: activeMembershipError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    'id,status,current_period_end,ends_at'
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


        if (
            activeMembershipError
        ) {

            throw activeMembershipError;

        }


        const activeMembership =
            activeMemberships?.[
                0
            ] ||
            null;


        const activeUntil =
            activeMembership
                ? (
                    activeMembership
                        .current_period_end ||
                    activeMembership
                        .ends_at
                )
                : null;


        if (
            activeMembership &&
            (
                !activeUntil ||
                new Date(
                    activeUntil
                ) >
                now
            )
        ) {

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


        /*
         * 6.
         * Toss Payments 실제 결제 승인
         *
         * 여기까지 성공해야 실제 카드 결제가 완료됩니다.
         */
        approvedPayment =
            await confirmTossPayment({
                paymentKey,
                orderId,
                amount:
                    planConfig.amount
            });


        /*
         * Toss가 승인해준 실제 결과도 다시 확인
         */
        if (
            approvedPayment
                ?.orderId !==
            orderId
        ) {

            throw new Error(
                '승인된 주문번호가 일치하지 않습니다.'
            );

        }


        const approvedAmount =
            Number(
                approvedPayment
                    ?.totalAmount ??
                approvedPayment
                    ?.balanceAmount ??
                approvedPayment
                    ?.amount
            );


        if (
            Number.isFinite(
                approvedAmount
            ) &&
            approvedAmount !==
            planConfig.amount
        ) {

            throw new Error(
                '승인된 결제금액이 일치하지 않습니다.'
            );

        }


        /*
         * 7.
         * 이용기간 계산
         */
        const startsAt =
            new Date();


        const endsAt =
            addMonths(
                startsAt,
                planConfig.months
            );


        /*
         * 8.
         * Song Club 이용권 활성화
         *
         * plan: 'basic'은 기존 DB 구조와
         * 기존 콘텐츠 권한 코드의 호환을 위해 유지합니다.
         *
         * 실제 1/6/12개월 차이는
         * current_period_end / ends_at으로 구분합니다.
         */
        const {
            data: membership,
            error: membershipError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .insert({
                    user_id:
                        user.id,

                    plan:
                        'basic',

                    status:
                        'active',

                    provider:
                        'tosspayments',

                    starts_at:
                        startsAt
                            .toISOString(),

                    trial_starts_at:
                        null,

                    trial_ends_at:
                        null,

                    current_period_start:
                        startsAt
                            .toISOString(),

                    current_period_end:
                        endsAt
                            .toISOString(),

                    ends_at:
                        endsAt
                            .toISOString(),

                    next_billing_at:
                        null,

                    cancel_at_period_end:
                        false,

                    updated_at:
                        startsAt
                            .toISOString()
                })
                .select(
                    'id,status,starts_at,current_period_start,current_period_end,ends_at'
                )
                .single();


        if (
            membershipError
        ) {

            /*
             * 돈은 이미 승인됐는데
             * 멤버십 저장 실패
             *
             * → 결제를 다시 취소
             */
            await cancelTossPayment(
                paymentKey
            );


            throw membershipError;

        }


        /*
         * 9.
         * 성공
         */
        return NextResponse.json({
            ok:
                true,

            plan,

            planLabel:
                planConfig.label,

            amount:
                planConfig.amount,

            months:
                planConfig.months,

            membership
        });


    } catch (error) {

        console.error(
            'payment confirm error:',
            {
                message:
                    error?.message,

                code:
                    error?.code,

                status:
                    error?.status
            }
        );


        return NextResponse.json(
            {
                error:
                    error?.message ||
                    '결제 처리 중 오류가 발생했습니다.',

                code:
                    error?.code ||
                    'PAYMENT_CONFIRM_ERROR'
            },
            {
                status:
                    Number.isInteger(
                        error?.status
                    )
                        ? error.status
                        : 500
            }
        );

    }

}