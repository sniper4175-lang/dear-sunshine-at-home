import {
    NextResponse
} from 'next/server';

import {
    createAdminSupabase
} from '../../../../lib/supabase-server';

import {
    createAuthSupabase
} from '../../../../lib/supabase-auth-server';

import {
    encryptBillingKey
} from '../../../../lib/billing-crypto';

import {
    issueBillingKey
} from '../../../../lib/toss-billing';


export const dynamic =
    'force-dynamic';


const TRIAL_DAYS =
    7;


function addDays(
    date,
    days
) {

    const result =
        new Date(
            date
        );


    result.setUTCDate(
        result.getUTCDate() +
        days
    );


    return result;
}


export async function POST(
    request
) {

    try {

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
                    status: 401
                }
            );

        }


        const body =
            await request.json();


        const authKey =
            String(
                body?.authKey ||
                ''
            ).trim();


        const customerKey =
            String(
                body?.customerKey ||
                ''
            ).trim();


        if (
            !authKey ||
            !customerKey
        ) {

            return NextResponse.json(
                {
                    error:
                        '결제 인증 정보가 올바르지 않습니다.'
                },
                {
                    status: 400
                }
            );

        }


        const db =
            createAdminSupabase();


        /*
         * URL에서 넘어온 customerKey를 그대로 신뢰하지 않음.
         * 현재 로그인 사용자에게 서버가 발급한 customerKey인지 검증.
         */
        const {
            data: billingProfile,
            error: profileError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .select(
                    'id,user_id,customer_key,billing_key_encrypted'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .eq(
                    'provider',
                    'tosspayments'
                )
                .eq(
                    'customer_key',
                    customerKey
                )
                .maybeSingle();


        if (
            profileError ||
            !billingProfile
        ) {

            return NextResponse.json(
                {
                    error:
                        '결제수단 등록 요청을 확인할 수 없습니다.'
                },
                {
                    status: 403
                }
            );

        }


        /*
         * 무료체험 중복 발급 방지:
         * 이 사용자의 멤버십 이력이 하나라도 있으면
         * 새 7일 무료체험을 자동 생성하지 않음.
         */
        const {
            data: membershipHistory,
            error: historyError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    'id,status,created_at'
                )
                .eq(
                    'user_id',
                    user.id
                )
                .limit(
                    1
                );


        if (historyError) {
            throw historyError;
        }


        if (
            membershipHistory &&
            membershipHistory.length >
            0
        ) {

            return NextResponse.json(
                {
                    error:
                        '이미 Song Club 이용 이력이 있어 새 무료체험을 시작할 수 없습니다.'
                },
                {
                    status: 409
                }
            );

        }


        /*
         * authKey -> billingKey 교환은 서버에서만 실행.
         * TOSS_SECRET_KEY는 브라우저에 절대 전달하지 않음.
         */
        const billing =
            await issueBillingKey({
                authKey,
                customerKey
            });


        if (!billing?.billingKey) {

            throw new Error(
                '토스페이먼츠 응답에 billingKey가 없습니다.'
            );

        }


        const encryptedBillingKey =
            encryptBillingKey(
                billing.billingKey
            );


        const paymentMethod =
            billing.method ||
            'CARD';


        const maskedCard =
            billing.card?.number ||
            billing.cardNumber ||
            null;


        const {
            error: profileUpdateError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .update({
                    billing_key_encrypted:
                        encryptedBillingKey,

                    payment_method:
                        paymentMethod,

                    payment_method_label:
                        maskedCard
                            ? `카드 ${maskedCard}`
                            : '등록된 결제수단',

                    is_active:
                        true,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    'id',
                    billingProfile.id
                );


        if (profileUpdateError) {
            throw profileUpdateError;
        }


        const trialStartsAt =
            new Date();


        const trialEndsAt =
            addDays(
                trialStartsAt,
                TRIAL_DAYS
            );


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

                    /*
                     * plan은 기존 DB 호환용 내부값.
                     * UI/권한 구분에는 사용하지 않음.
                     */
                    plan:
                        'basic',

                    status:
                        'trialing',

                    provider:
                        'tosspayments',

                    starts_at:
                        trialStartsAt
                            .toISOString(),

                    trial_starts_at:
                        trialStartsAt
                            .toISOString(),

                    trial_ends_at:
                        trialEndsAt
                            .toISOString(),

                    current_period_start:
                        trialStartsAt
                            .toISOString(),

                    current_period_end:
                        trialEndsAt
                            .toISOString(),

                    next_billing_at:
                        trialEndsAt
                            .toISOString(),

                    cancel_at_period_end:
                        false,

                    updated_at:
                        trialStartsAt
                            .toISOString()
                })
                .select(
                    'id,status,trial_starts_at,trial_ends_at,next_billing_at'
                )
                .single();


        if (membershipError) {

            /*
             * 빌링키는 이미 발급됐지만 멤버십 생성 실패.
             * 결제는 아직 발생하지 않았음.
             * 운영 전에는 관리자 알림/복구 로그를 추가할 예정.
             */
            throw membershipError;

        }


        return NextResponse.json({
            ok:
                true,

            membership
        });


    } catch (error) {

        console.error(
            'billing issue error:',
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
                    '결제수단 등록 처리 중 오류가 발생했습니다.',

                code:
                    error?.code ||
                    'BILLING_ISSUE_ERROR'
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
