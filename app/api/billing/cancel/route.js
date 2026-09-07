import {
    NextResponse
} from 'next/server';

import {
    createAuthSupabase
} from '../../../../lib/supabase-auth-server';

import {
    createAdminSupabase
} from '../../../../lib/supabase-server';


function getAccessUntil(
    membership
) {

    if (
        membership.status ===
        'trialing'
    ) {
        return (
            membership.trial_ends_at ||
            membership.current_period_end ||
            membership.ends_at ||
            null
        );
    }


    return (
        membership.current_period_end ||
        membership.ends_at ||
        null
    );
}


export async function POST() {

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


        const db =
            createAdminSupabase();


        const {
            data: membership,
            error: membershipError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    `
                    id,
                    user_id,
                    status,
                    ends_at,
                    trial_ends_at,
                    current_period_end,
                    next_billing_at,
                    cancel_at_period_end,
                    cancelled_at
                    `
                )
                .eq(
                    'user_id',
                    user.id
                )
                .in(
                    'status',
                    [
                        'trialing',
                        'active',
                        'past_due'
                    ]
                )
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();


        if (membershipError) {
            throw membershipError;
        }


        if (!membership) {
            return NextResponse.json(
                {
                    error:
                        '해지할 멤버십을 찾을 수 없습니다.'
                },
                {
                    status: 404
                }
            );
        }


        if (
            membership.cancel_at_period_end
        ) {
            return NextResponse.json({
                ok: true,
                alreadyCancelled: true,
                cancelAtPeriodEnd: true,
                accessUntil:
                    getAccessUntil(
                        membership
                    )
            });
        }


        const now =
            new Date();


        /*
         * past_due는 이미 결제일이 지난 상태이므로
         * 재시도를 중단하고 즉시 cancelled 처리한다.
         */
        if (
            membership.status ===
            'past_due'
        ) {

            const {
                error: cancelError
            } =
                await db
                    .from(
                        'ds_content_memberships'
                    )
                    .update({
                        status:
                            'cancelled',
                        cancel_at_period_end:
                            true,
                        cancelled_at:
                            now.toISOString(),
                        next_billing_at:
                            null,
                        billing_retry_at:
                            null,
                        billing_processing_at:
                            null,
                        updated_at:
                            now.toISOString()
                    })
                    .eq(
                        'id',
                        membership.id
                    );


            if (cancelError) {
                throw cancelError;
            }


            await db
                .from(
                    'ds_billing_profiles'
                )
                .update({
                    is_active:
                        false,
                    updated_at:
                        now.toISOString()
                })
                .eq(
                    'user_id',
                    user.id
                )
                .eq(
                    'provider',
                    'tosspayments'
                );


            return NextResponse.json({
                ok: true,
                cancelledImmediately: true,
                cancelAtPeriodEnd: true,
                accessUntil: null
            });
        }


        const accessUntil =
            getAccessUntil(
                membership
            );


        if (!accessUntil) {
            return NextResponse.json(
                {
                    error:
                        '현재 이용기간 종료일을 확인할 수 없습니다.'
                },
                {
                    status: 409
                }
            );
        }


        const {
            error: cancelError
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .update({
                    cancel_at_period_end:
                        true,
                    cancelled_at:
                        now.toISOString(),
                    billing_retry_at:
                        null,
                    billing_processing_at:
                        null,
                    updated_at:
                        now.toISOString()
                })
                .eq(
                    'id',
                    membership.id
                );


        if (cancelError) {
            throw cancelError;
        }


        return NextResponse.json({
            ok: true,
            cancelAtPeriodEnd: true,
            accessUntil
        });

    } catch (error) {

        console.error(
            '[billing cancel] failed',
            error
        );


        return NextResponse.json(
            {
                error:
                    error?.message ||
                    '구독 해지 처리 중 오류가 발생했습니다.'
            },
            {
                status: 500
            }
        );
    }
}
