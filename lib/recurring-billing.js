import {
    createHash
} from 'node:crypto';

import {
    createAdminSupabase
} from './supabase-server';

import {
    decryptBillingKey
} from './billing-crypto';

import {
    chargeBillingKey,
    getPaymentByOrderId
} from './toss-billing';


const DEFAULT_PRICE =
    12900;


const MAX_RETRY_COUNT =
    3;


function getMonthlyPrice() {

    const parsed =
        Number(
            process.env
                .SONG_CLUB_MONTHLY_PRICE ||
            DEFAULT_PRICE
        );


    if (
        !Number.isInteger(
            parsed
        ) ||
        parsed <= 0
    ) {
        throw new Error(
            'SONG_CLUB_MONTHLY_PRICE가 올바르지 않습니다.'
        );
    }


    return parsed;
}


function addMonthsClamped(
    date,
    months = 1
) {

    const source =
        new Date(
            date
        );


    const originalDay =
        source.getUTCDate();


    const target =
        new Date(
            source
        );


    target.setUTCDate(
        1
    );


    target.setUTCMonth(
        target.getUTCMonth() +
        months
    );


    const endOfTargetMonth =
        new Date(
            Date.UTC(
                target.getUTCFullYear(),
                target.getUTCMonth() + 1,
                0,
                target.getUTCHours(),
                target.getUTCMinutes(),
                target.getUTCSeconds(),
                target.getUTCMilliseconds()
            )
        );


    target.setUTCDate(
        Math.min(
            originalDay,
            endOfTargetMonth.getUTCDate()
        )
    );


    return target;
}


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


function makeOrderId(
    membershipId,
    dueAt
) {

    const digest =
        createHash(
            'sha256'
        )
        .update(
            `${membershipId}|${dueAt}`
        )
        .digest(
            'hex'
        )
        .slice(
            0,
            30
        );


    return `ds_${digest}`;
}


function paymentLooksPaid(
    payment
) {

    return Boolean(
        payment &&
        payment.status === 'DONE' &&
        payment.paymentKey
    );
}


async function getCustomerEmail(
    db,
    userId
) {

    try {

        const {
            data,
            error
        } =
            await db.auth.admin
                .getUserById(
                    userId
                );


        if (
            error ||
            !data?.user?.email
        ) {
            return null;
        }


        return data.user.email;

    } catch {
        return null;
    }
}


async function upsertReadyTransaction({
    db,
    membership,
    orderId,
    amount
}) {

    const {
        data: existing,
        error: existingError
    } =
        await db
            .from(
                'ds_payment_transactions'
            )
            .select(
                'id,status,payment_key,approved_at,failed_at,failure_code,failure_message'
            )
            .eq(
                'provider',
                'tosspayments'
            )
            .eq(
                'order_id',
                orderId
            )
            .maybeSingle();


    if (existingError) {
        throw existingError;
    }


    if (existing) {
        return existing;
    }


    const {
        data: inserted,
        error: insertError
    } =
        await db
            .from(
                'ds_payment_transactions'
            )
            .insert({
                user_id:
                    membership.user_id,

                membership_id:
                    membership.id,

                provider:
                    'tosspayments',

                order_id:
                    orderId,

                amount,

                currency:
                    'KRW',

                status:
                    'ready'
            })
            .select(
                'id,status,payment_key,approved_at,failed_at,failure_code,failure_message'
            )
            .single();


    if (insertError) {

        if (
            insertError.code === '23505'
        ) {

            const {
                data: raced,
                error: racedError
            } =
                await db
                    .from(
                        'ds_payment_transactions'
                    )
                    .select(
                        'id,status,payment_key,approved_at,failed_at,failure_code,failure_message'
                    )
                    .eq(
                        'provider',
                        'tosspayments'
                    )
                    .eq(
                        'order_id',
                        orderId
                    )
                    .single();


            if (racedError) {
                throw racedError;
            }


            return raced;
        }


        throw insertError;
    }


    return inserted;
}


async function finalizeSuccess({
    db,
    membership,
    transactionId,
    payment,
    orderId
}) {

    const dueAt =
        new Date(
            membership.next_billing_at
        );


    const nextPeriodEnd =
        addMonthsClamped(
            dueAt,
            1
        );


    const approvedAt =
        payment.approvedAt ||
        new Date().toISOString();


    const {
        error: transactionError
    } =
        await db
            .from(
                'ds_payment_transactions'
            )
            .update({
                payment_key:
                    payment.paymentKey ||
                    null,

                status:
                    'paid',

                method:
                    payment.method ||
                    '카드',

                approved_at:
                    approvedAt,

                failed_at:
                    null,

                failure_code:
                    null,

                failure_message:
                    null,

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                'id',
                transactionId
            );


    if (transactionError) {
        throw transactionError;
    }


    const {
        error: membershipError
    } =
        await db
            .from(
                'ds_content_memberships'
            )
            .update({
                status:
                    'active',

                current_period_start:
                    dueAt.toISOString(),

                current_period_end:
                    nextPeriodEnd.toISOString(),

                next_billing_at:
                    nextPeriodEnd.toISOString(),

                last_payment_at:
                    approvedAt,

                billing_processing_at:
                    null,

                billing_retry_count:
                    0,

                billing_retry_at:
                    null,

                last_billing_error:
                    null,

                last_billing_attempt_at:
                    new Date().toISOString(),

                updated_at:
                    new Date().toISOString()
            })
            .eq(
                'id',
                membership.id
            );


    if (membershipError) {
        throw membershipError;
    }


    return {
        ok: true,
        orderId,
        paymentKey:
            payment.paymentKey ||
            null,
        nextBillingAt:
            nextPeriodEnd.toISOString()
    };
}


async function finalizeFailure({
    db,
    membership,
    transactionId,
    orderId,
    error
}) {

    const attemptedAt =
        new Date();


    const nextRetryCount =
        Number(
            membership.billing_retry_count ||
            0
        ) + 1;


    const retryAllowed =
        nextRetryCount <
        MAX_RETRY_COUNT;


    const nextRetryAt =
        retryAllowed
            ? addDays(
                attemptedAt,
                1
            ).toISOString()
            : null;


    const code =
        String(
            error?.code ||
            'BILLING_CHARGE_FAILED'
        ).slice(
            0,
            200
        );


    const message =
        String(
            error?.message ||
            '자동결제에 실패했습니다.'
        ).slice(
            0,
            1000
        );


    const {
        error: transactionError
    } =
        await db
            .from(
                'ds_payment_transactions'
            )
            .update({
                status:
                    'failed',

                failed_at:
                    attemptedAt.toISOString(),

                failure_code:
                    code,

                failure_message:
                    message,

                updated_at:
                    attemptedAt.toISOString()
            })
            .eq(
                'id',
                transactionId
            );


    if (transactionError) {
        console.error(
            '[billing] failed to record payment failure',
            transactionError
        );
    }


    const {
        error: membershipError
    } =
        await db
            .from(
                'ds_content_memberships'
            )
            .update({
                status:
                    'past_due',

                billing_retry_at:
                    nextRetryAt,

                billing_processing_at:
                    null,

                billing_retry_count:
                    nextRetryCount,

                last_billing_error:
                    `${code}: ${message}`,

                last_billing_attempt_at:
                    attemptedAt.toISOString(),

                updated_at:
                    attemptedAt.toISOString()
            })
            .eq(
                'id',
                membership.id
            );


    if (membershipError) {
        console.error(
            '[billing] failed to mark membership past_due',
            membershipError
        );
    }


    return {
        ok: false,
        orderId,
        code,
        message,
        retryCount:
            nextRetryCount,
        nextRetryAt
    };
}


export async function processOneMembership(
    membership
) {

    const db =
        createAdminSupabase();


    const amount =
        getMonthlyPrice();


    const orderId =
        makeOrderId(
            membership.id,
            membership.next_billing_at
        );


    const transaction =
        await upsertReadyTransaction({
            db,
            membership,
            orderId,
            amount
        });


    if (
        transaction.status === 'paid'
    ) {
        return {
            ok: true,
            orderId,
            paymentKey:
                transaction.payment_key ||
                null,
            alreadyPaid:
                true
        };
    }


    try {

        const existingPayment =
            await getPaymentByOrderId(
                orderId
            );


        if (
            paymentLooksPaid(
                existingPayment
            )
        ) {

            return await finalizeSuccess({
                db,
                membership,
                transactionId:
                    transaction.id,
                payment:
                    existingPayment,
                orderId
            });
        }


        const {
            data: billingProfile,
            error: billingProfileError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .select(
                    'customer_key,billing_key_encrypted,is_active'
                )
                .eq(
                    'user_id',
                    membership.user_id
                )
                .eq(
                    'provider',
                    'tosspayments'
                )
                .maybeSingle();


        if (
            billingProfileError ||
            !billingProfile ||
            !billingProfile.is_active ||
            !billingProfile.billing_key_encrypted
        ) {

            const missingBillingError =
                new Error(
                    '활성화된 결제수단을 찾을 수 없습니다.'
                );


            missingBillingError.code =
                'BILLING_PROFILE_MISSING';


            throw missingBillingError;
        }


        const billingKey =
            decryptBillingKey(
                billingProfile.billing_key_encrypted
            );


        const customerEmail =
            await getCustomerEmail(
                db,
                membership.user_id
            );


        const payment =
            await chargeBillingKey({
                billingKey,
                customerKey:
                    billingProfile.customer_key,
                amount,
                orderId,
                orderName:
                    'Dear Sunshine Monthly Song Club',
                customerEmail
            });


        return await finalizeSuccess({
            db,
            membership,
            transactionId:
                transaction.id,
            payment,
            orderId
        });

    } catch (error) {

        /*
         * 네트워크 타임아웃/중복 orderId 등으로
         * 실제 결제는 되었지만 응답을 못 받았을 수 있으므로
         * 마지막으로 orderId 조회를 한 번 더 시도한다.
         */
        try {

            const recovered =
                await getPaymentByOrderId(
                    orderId
                );


            if (
                paymentLooksPaid(
                    recovered
                )
            ) {

                return await finalizeSuccess({
                    db,
                    membership,
                    transactionId:
                        transaction.id,
                    payment:
                        recovered,
                    orderId
                });
            }

        } catch (lookupError) {

            console.error(
                '[billing] recovery lookup failed',
                lookupError
            );
        }


        return await finalizeFailure({
            db,
            membership,
            transactionId:
                transaction.id,
            orderId,
            error
        });
    }
}


async function finalizeDueCancellations(
    db
) {

    const {
        data: memberships,
        error
    } =
        await db
            .from(
                'ds_content_memberships'
            )
            .select(
                'id,user_id,status,ends_at,trial_ends_at,current_period_end,cancel_at_period_end'
            )
            .eq(
                'cancel_at_period_end',
                true
            )
            .in(
                'status',
                [
                    'trialing',
                    'active',
                    'past_due'
                ]
            )
            .limit(
                100
            );


    if (error) {
        throw error;
    }


    const now =
        new Date();


    const due =
        (memberships || [])
            .filter(
                membership => {

                    if (
                        membership.status ===
                        'past_due'
                    ) {
                        return true;
                    }


                    const accessUntil =
                        membership.status ===
                        'trialing'
                            ? (
                                membership.trial_ends_at ||
                                membership.current_period_end ||
                                membership.ends_at
                            )
                            : (
                                membership.current_period_end ||
                                membership.ends_at
                            );


                    return Boolean(
                        accessUntil &&
                        new Date(
                            accessUntil
                        ) <=
                        now
                    );
                }
            );


    for (
        const membership of due
    ) {

        const timestamp =
            now.toISOString();


        const {
            error: membershipError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .update({
                    status:
                        'cancelled',
                    next_billing_at:
                        null,
                    billing_retry_at:
                        null,
                    billing_processing_at:
                        null,
                    updated_at:
                        timestamp
                })
                .eq(
                    'id',
                    membership.id
                )
                .eq(
                    'cancel_at_period_end',
                    true
                );


        if (membershipError) {
            throw membershipError;
        }


        const {
            error: profileError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .update({
                    is_active:
                        false,
                    updated_at:
                        timestamp
                })
                .eq(
                    'user_id',
                    membership.user_id
                )
                .eq(
                    'provider',
                    'tosspayments'
                );


        if (profileError) {
            console.error(
                '[billing] failed to deactivate cancelled billing profile',
                profileError
            );
        }
    }


    return due.length;
}


export async function runRecurringBilling({
    limit = 20
} = {}) {

    const db =
        createAdminSupabase();


    const cancelled =
        await finalizeDueCancellations(
            db
        );


    const safeLimit =
        Math.min(
            Math.max(
                Number(
                    limit
                ) || 20,
                1
            ),
            100
        );


    const {
        data: dueMemberships,
        error: claimError
    } =
        await db.rpc(
            'ds_claim_due_memberships',
            {
                p_limit:
                    safeLimit
            }
        );


    if (claimError) {
        throw claimError;
    }


    const results = [];


    for (
        const membership of
        dueMemberships || []
    ) {

        try {
            results.push(
                {
                    membershipId:
                        membership.id,
                    userId:
                        membership.user_id,
                    ...(await processOneMembership(
                        membership
                    ))
                }
            );
        } catch (error) {

            console.error(
                '[billing] membership processing failed',
                membership.id,
                error
            );


            await db
                .from(
                    'ds_content_memberships'
                )
                .update({
                    billing_processing_at:
                        null,
                    last_billing_error:
                        String(
                            error?.message ||
                            error
                        ).slice(
                            0,
                            1000
                        ),
                    last_billing_attempt_at:
                        new Date().toISOString(),
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    'id',
                    membership.id
                );


            results.push({
                membershipId:
                    membership.id,
                userId:
                    membership.user_id,
                ok: false,
                code:
                    error?.code ||
                    'PROCESSING_FAILED',
                message:
                    error?.message ||
                    '자동결제 처리 중 오류가 발생했습니다.'
            });
        }
    }


    return {
        cancelled,
        claimed:
            dueMemberships?.length ||
            0,
        paid:
            results.filter(
                (item) => item.ok
            ).length,
        failed:
            results.filter(
                (item) => !item.ok
            ).length,
        results
    };
}
