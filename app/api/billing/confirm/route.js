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
 * ==========================================
 * Song Club 판매 상품
 *
 * 브라우저에서 넘어온 금액을 그대로 믿지 않고
 * 서버에서 상품별 실제 금액을 다시 확인합니다.
 * ==========================================
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
 * ==========================================
 * orderId에서 상품 종류 확인
 *
 * MembershipPaymentButton에서:
 *
 * sunshine_monthly_xxxxx
 * sunshine_sixMonths_xxxxx
 * sunshine_twelveMonths_xxxxx
 *
 * 형태로 생성됩니다.
 * ==========================================
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
 * ==========================================
 * 달력 기준으로 개월 수 추가
 *
 * 예:
 * 9월 12일 + 1개월
 * → 10월 12일
 *
 * 1월 31일 + 1개월
 * → 2월 마지막 날
 * ==========================================
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
     * 31일 때문에 다음 달로 밀리는 것을
     * 방지하기 위해 먼저 1일로 이동
     */
    result.setUTCDate(
        1
    );


    result.setUTCMonth(
        result.getUTCMonth() +
        months
    );


    /*
     * 이동한 달의 마지막 날짜
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
 * ==========================================
 * Toss API Authorization
 * ==========================================
 */
function getTossAuthorization() {

    const secretKey =
        process.env
            .TOSS_SECRET_KEY;


    if (!secretKey) {

        throw new Error(
            'TOSS_SECRET_KEY가 설정되지 않았습니다.'
        );

    }


    return (
        'Basic ' +
        Buffer
            .from(
                `${secretKey}:`
            )
            .toString(
                'base64'
            )
    );

}


/*
 * ==========================================
 * paymentKey로 Toss 결제 조회
 *
 * 결제 승인 요청 결과가 애매한 경우
 * 실제 승인 여부를 한 번 더 확인하기 위해 사용
 * ==========================================
 */
async function getTossPayment(
    paymentKey
) {

    const response =
        await fetch(
            `https://api.tosspayments.com/v1/payments/${encodeURIComponent(
                paymentKey
            )}`,
            {
                method:
                    'GET',

                headers: {
                    Authorization:
                        getTossAuthorization()
                },

                cache:
                    'no-store'
            }
        );


    if (!response.ok) {

        return null;

    }


    return response.json();

}


/*
 * ==========================================
 * Toss 일반결제 최종 승인
 * ==========================================
 */
async function confirmTossPayment({
    paymentKey,
    orderId,
    amount
}) {

    const response =
        await fetch(
            'https://api.tosspayments.com/v1/payments/confirm',
            {
                method:
                    'POST',

                headers: {
                    Authorization:
                        getTossAuthorization(),

                    'Content-Type':
                        'application/json'
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


    /*
     * 정상 승인
     */
    if (response.ok) {

        return data;

    }


    /*
     * 네트워크 재시도 또는 페이지 재요청 등의 상황에서
     * 이미 승인된 결제일 가능성이 있으므로
     * paymentKey로 실제 상태를 다시 확인합니다.
     */
    const existingPayment =
        await getTossPayment(
            paymentKey
        );


    if (
        existingPayment &&
        existingPayment.status ===
            'DONE' &&
        existingPayment.orderId ===
            orderId &&
        Number(
            existingPayment.totalAmount
        ) ===
            amount
    ) {

        return existingPayment;

    }


    const error =
        new Error(
            data?.message ||
            '토스페이먼츠 결제 승인에 실패했습니다.'
        );


    error.code =
        data?.code ||
        'TOSS_CONFIRM_ERROR';


    error.status =
        response.status;


    throw error;

}


/*
 * ==========================================
 * 결제 취소
 *
 * 결제 승인에는 성공했는데
 * DB 멤버십 생성에 실패한 경우
 * 사용자에게 돈만 청구되는 일을 방지합니다.
 * ==========================================
 */
async function cancelTossPayment(
    paymentKey
) {

    try {

        const response =
            await fetch(
                `https://api.tosspayments.com/v1/payments/${encodeURIComponent(
                    paymentKey
                )}/cancel`,
                {
                    method:
                        'POST',

                    headers: {
                        Authorization:
                            getTossAuthorization(),

                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            cancelReason:
                                'Song Club 멤버십 활성화 실패'
                        }),

                    cache:
                        'no-store'
                }
            );


        if (!response.ok) {

            const result =
                await response
                    .json()
                    .catch(
                        () => null
                    );


            console.error(
                'payment rollback failed:',
                result
            );

        }


    } catch (error) {

        console.error(
            'payment rollback error:',
            error
        );

    }

}


/*
 * ==========================================
 * POST /api/billing/confirm
 * ==========================================
 */
export async function POST(
    request
) {

    let paymentWasApproved =
        false;


    let approvedPaymentKey =
        null;


    try {

        /*
         * ======================================
         * 1. 로그인 사용자 확인
         * ======================================
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
         * ======================================
         * 2. 결제 정보 읽기
         * ======================================
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
            !Number.isInteger(
                amount
            ) ||
            amount <= 0
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
         * ======================================
         * 3. orderId에서 상품 확인
         * ======================================
         */
        const plan =
            getPlanFromOrderId(
                orderId
            );


        if (!plan) {

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


        const planConfig =
            PLAN_CONFIG[
                plan
            ];


        /*
         * ======================================
         * 4. 결제 금액 서버 재검증
         *
         * 사용자가 브라우저에서 가격을
         * 임의로 바꾸더라도 여기서 차단
         * ======================================
         */
        if (
            amount !==
            planConfig.amount
        ) {

            console.error(
                'payment amount mismatch:',
                {
                    userId:
                        user.id,

                    orderId,

                    receivedAmount:
                        amount,

                    expectedAmount:
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
         * ======================================
         * 5. 현재 사용 중인 멤버십 확인
         *
         * 이미 이용권이 남아 있다면
         * 중복 구매를 막습니다.
         * ======================================
         */
        const {
            data: memberships,
            error: membershipReadError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    'id,status,starts_at,current_period_end,ends_at,created_at'
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
            membershipReadError
        ) {

            throw membershipReadError;

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


            const stillActive =
                !accessUntil ||
                new Date(
                    accessUntil
                ) >
                    new Date();


            if (stillActive) {

                /*
                 * 성공 페이지 새로고침 등의 상황에서도
                 * 이미 활성 멤버십이 있다면
                 * 추가 결제를 진행하지 않습니다.
                 */
                return NextResponse.json({
                    ok:
                        true,

                    alreadyActive:
                        true,

                    plan,

                    planLabel:
                        planConfig.label,

                    amount:
                        planConfig.amount,

                    months:
                        planConfig.months,

                    membership:
                        currentMembership
                });

            }

        }


        /*
         * ======================================
         * 6. Toss에 실제 결제 승인 요청
         * ======================================
         */
        const approvedPayment =
            await confirmTossPayment({
                paymentKey,
                orderId,
                amount:
                    planConfig.amount
            });


        paymentWasApproved =
            true;


        approvedPaymentKey =
            paymentKey;


        /*
         * ======================================
         * 7. Toss 승인 결과 재검증
         * ======================================
         */
        if (
            approvedPayment
                ?.paymentKey !==
            paymentKey
        ) {

            throw new Error(
                '승인된 결제키가 일치하지 않습니다.'
            );

        }


        if (
            approvedPayment
                ?.orderId !==
            orderId
        ) {

            throw new Error(
                '승인된 주문번호가 일치하지 않습니다.'
            );

        }


        if (
            Number(
                approvedPayment
                    ?.totalAmount
            ) !==
            planConfig.amount
        ) {

            throw new Error(
                '승인된 결제금액이 일치하지 않습니다.'
            );

        }


        if (
            approvedPayment
                ?.status !==
            'DONE'
        ) {

            throw new Error(
                '결제가 정상적으로 완료되지 않았습니다.'
            );

        }


        /*
         * 일반결제만 허용
         */
        if (
            approvedPayment?.type &&
            approvedPayment.type !==
                'NORMAL'
        ) {

            throw new Error(
                '올바르지 않은 결제 방식입니다.'
            );

        }


        /*
         * ======================================
         * 8. 멤버십 이용기간 계산
         * ======================================
         */
        const startsAt =
            approvedPayment
                ?.approvedAt
                ? new Date(
                    approvedPayment
                        .approvedAt
                )
                : new Date();


        const endsAt =
            addMonths(
                startsAt,
                planConfig.months
            );


        /*
         * ======================================
         * 9. DB에 멤버십 생성
         *
         * 자동결제 정보 없음
         * 무료체험 정보 없음
         * ======================================
         */
        const {
            data: membership,
            error: membershipInsertError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .insert({
                    user_id:
                        user.id,

                    /*
                     * 기존 콘텐츠 접근 로직과
                     * 호환하기 위해 basic 유지
                     */
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

                    /*
                     * 자동결제 없음
                     */
                    next_billing_at:
                        null,

                    cancel_at_period_end:
                        false,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .select(
                    [
                        'id',
                        'status',
                        'starts_at',
                        'current_period_start',
                        'current_period_end',
                        'ends_at'
                    ].join(',')
                )
                .single();


        /*
         * 결제는 됐는데 멤버십 생성 실패
         * → 승인된 금액을 다시 취소
         */
        if (
            membershipInsertError
        ) {

            if (
                paymentWasApproved &&
                approvedPaymentKey
            ) {

                await cancelTossPayment(
                    approvedPaymentKey
                );

            }


            throw membershipInsertError;

        }


        /*
         * ======================================
         * 10. 완료
         * ======================================
         */
        return NextResponse.json({

            ok:
                true,

            alreadyActive:
                false,

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