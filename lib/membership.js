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

function unique(values) {
    return [
        ...new Set(
            (values || []).filter(Boolean)
        )
    ];
}

function makeBonusOnlyMembership(userId, bonusSongIds) {
    return {
        id: `account-bonus:${userId}`,
        user_id: userId,
        plan: 'account_bonus',
        status: 'active',
        starts_at: null,
        ends_at: null,
        provider: 'account_bonus',
        created_at: null,
        product_type: 'bonus_only',
        song_club_active: false,
        song_club_membership: null,
        home_package_active: false,
        home_package: null,
        home_package_program: null,
        home_package_programs: [],
        home_package_unlocked_song_ids: [],
        home_package_all_song_ids: [],
        home_package_bonus_song_ids: [],
        account_bonus_song_ids: bonusSongIds
    };
}

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
            accountBonusSongIds: [],
            billingProfile: null
        };
    }

    const db =
        createAdminSupabase();

    /*
     * Song Club / Home Package / 계정별 추가곡은 서로 독립적이므로
     * 동시에 조회합니다.
     */
    const [
        membershipResult,
        homePackageResult,
        accountBonusResult
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
        ),

        db
            .from('ds_user_bonus_songs')
            .select('song_id')
            .eq('user_id', user.id)
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

    const accountBonusSongIds =
        accountBonusResult?.error
            ? []
            : unique(
                (accountBonusResult?.data || [])
                    .map((row) => row.song_id)
            );

    /*
     * SQL을 아직 적용하지 않은 배포에서도 기존 앱은 정상 동작하도록
     * 계정별 추가곡 테이블 오류는 빈 목록으로 처리합니다.
     */
    if (accountBonusResult?.error) {
        const code = String(
            accountBonusResult.error?.code || ''
        );

        if (!['42P01', 'PGRST205'].includes(code)) {
            console.error(
                'account bonus song lookup error:',
                accountBonusResult.error
            );
        }
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

    /*
     * Home Package 회원이라면 계정별 추가곡도 Home Package의 보너스곡처럼
     * 즉시 노출되도록 합쳐줍니다.
     */
    const homePackage =
        homePackageResult
            ? {
                ...homePackageResult,
                bonus_song_ids: unique([
                    ...(homePackageResult.bonus_song_ids || []),
                    ...accountBonusSongIds
                ]),
                unlocked_song_ids: unique([
                    ...(homePackageResult.unlocked_song_ids || []),
                    ...accountBonusSongIds
                ]),
                all_song_ids: unique([
                    ...(homePackageResult.all_song_ids || []),
                    ...accountBonusSongIds
                ])
            }
            : null;

    let effectiveMembership =
        mergeProductMemberships(
            validMembership,
            homePackage
        );

    if (accountBonusSongIds.length > 0) {
        effectiveMembership =
            effectiveMembership
                ? {
                    ...effectiveMembership,
                    account_bonus_song_ids:
                        accountBonusSongIds
                }
                : makeBonusOnlyMembership(
                    user.id,
                    accountBonusSongIds
                );
    } else if (effectiveMembership) {
        effectiveMembership = {
            ...effectiveMembership,
            account_bonus_song_ids: []
        };
    }

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
        accountBonusSongIds,
        billingProfile
    };
}
