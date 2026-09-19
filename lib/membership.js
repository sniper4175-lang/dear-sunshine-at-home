import {
    createAuthSupabase
} from './supabase-auth-server';

import {
    createAdminSupabase
} from './supabase-server';

import {
    getHomePackageMembership,
    mergeProductMemberships
} from './home-package';

/*
 * includeBillingProfile=false를 주면 노래 상세처럼
 * 결제수단 정보가 필요 없는 화면에서 DB 조회 1회를 줄일 수 있습니다.
 */
export async function getCurrentMembership(
    options = {}
) {
    const includeBillingProfile =
        options?.includeBillingProfile !== false;

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
        return {
            user: null,
            membership: null,
            songClubMembership: null,
            homePackage: null,
            billingProfile: null
        };
    }

    const db =
        createAdminSupabase();

    /*
     * Song Club 이용권 조회와 Home Package 조회는 서로 독립적이므로
     * 동시에 실행합니다. 기존 순차 실행보다 상세페이지 대기시간이 짧아집니다.
     */
    const [
        membershipResult,
        homePackage
    ] = await Promise.all([
        db
            .from('ds_content_memberships')
            .select(`
                id,
                user_id,
                plan,
                status,
                starts_at,
                ends_at,
                trial_starts_at,
                trial_ends_at,
                current_period_start,
                current_period_end,
                next_billing_at,
                cancel_at_period_end,
                cancelled_at,
                provider,
                created_at
            `)
            .eq('user_id', user.id)
            .in(
                'status',
                [
                    'trialing',
                    'active'
                ]
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            ),

        getHomePackageMembership(
            db,
            user.id
        )
    ]);

    const {
        data: memberships,
        error
    } = membershipResult;

    if (error) {
        console.error(
            'membership error:',
            error
        );
    }

    const now =
        new Date();

    const validMembership =
        error
            ? null
            : (
                (memberships || [])
                    .find(
                        (membership) => {
                            if (
                                membership.starts_at &&
                                new Date(
                                    membership.starts_at
                                ) > now
                            ) {
                                return false;
                            }

                            if (
                                membership.status ===
                                'trialing'
                            ) {
                                if (
                                    !membership.trial_ends_at ||
                                    new Date(
                                        membership.trial_ends_at
                                    ) <= now
                                ) {
                                    return false;
                                }
                            }

                            if (
                                membership.cancel_at_period_end
                            ) {
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

                                if (
                                    !accessUntil ||
                                    new Date(
                                        accessUntil
                                    ) <= now
                                ) {
                                    return false;
                                }
                            }

                            if (
                                membership.ends_at &&
                                new Date(
                                    membership.ends_at
                                ) <= now
                            ) {
                                return false;
                            }

                            return true;
                        }
                    ) || null
            );

    const effectiveMembership =
        mergeProductMemberships(
            validMembership,
            homePackage
        );

    let billingProfile =
        null;

    if (
        validMembership &&
        includeBillingProfile
    ) {
        const {
            data: profile,
            error: profileError
        } = await db
            .from('ds_billing_profiles')
            .select(
                'payment_method,payment_method_label,is_active'
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

        if (profileError) {
            console.error(
                'billing profile error:',
                profileError
            );
        } else {
            billingProfile =
                profile || null;
        }
    }

    return {
        user,
        membership: effectiveMembership,
        songClubMembership: validMembership,
        homePackage,
        billingProfile
    };
}
