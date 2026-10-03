import { unstable_cache } from 'next/cache';

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
 * 로그인 사용자의 회원권/상품/추가곡은 페이지를 이동할 때 거의 동일합니다.
 * 기존에는 / -> /library -> /song 이동 때마다 같은 Supabase 조회를 다시 했습니다.
 * userId를 캐시 키로 사용해 짧은 시간 동안 서버 Data Cache를 공유합니다.
 *
 * 관리자에서 회원 활성화/권한 변경을 해도 최대 15초 후에는 자동 갱신됩니다.
 */
const getMembershipSnapshotCached = unstable_cache(
    async (userId) => {
        const db = createAdminSupabase();

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
                .eq('user_id', userId)
                .in('status', ['trialing', 'active'])
                .order('created_at', { ascending: false }),

            getHomePackageMembership(
                db,
                userId
            ),

            db
                .from('ds_user_bonus_songs')
                .select('song_id')
                .eq('user_id', userId)
        ]);

        if (membershipResult?.error) {
            console.error(
                'membership error:',
                membershipResult.error
            );
        }

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

        return {
            memberships:
                membershipResult?.error
                    ? []
                    : (membershipResult?.data || []),
            membershipLookupFailed:
                Boolean(membershipResult?.error),
            homePackageResult:
                homePackageResult || null,
            accountBonusSongIds:
                accountBonusResult?.error
                    ? []
                    : unique(
                        (accountBonusResult?.data || [])
                            .map((row) => row.song_id)
                    )
        };
    },
    ['ds-membership-snapshot-v4'],
    {
        revalidate: 15
    }
);


const getBillingProfileCached = unstable_cache(
    async (userId) => {
        const db = createAdminSupabase();

        const {
            data,
            error
        } = await db
            .from('ds_billing_profiles')
            .select(
                'payment_method,payment_method_label,is_active'
            )
            .eq('user_id', userId)
            .eq('provider', 'tosspayments')
            .maybeSingle();

        if (error) {
            console.error(
                'billing profile error:',
                error
            );
            return null;
        }

        return data || null;
    },
    ['ds-billing-profile-v3'],
    {
        revalidate: 30
    }
);


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

    /*
     * Proxy에서 이미 세션 refresh/검증을 수행합니다.
     * getClaims()는 새 Supabase 프로젝트의 비대칭 JWT에서
     * 캐시된 JWKS로 검증될 수 있어 getUser()보다 빠릅니다.
     */
    const {
        data: claimsData,
        error: claimsError
    } = await authSupabase
        .auth
        .getClaims();

    const claims =
        claimsData?.claims ||
        null;

    const user =
        claims?.sub
            ? {
                id: String(claims.sub),
                email: String(claims.email || '')
            }
            : null;

    if (
        claimsError ||
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

    const snapshot =
        await getMembershipSnapshotCached(
            user.id
        );

    const memberships =
        snapshot?.memberships || [];

    const accountBonusSongIds =
        snapshot?.accountBonusSongIds || [];

    const now =
        new Date();

    const validMembership =
        snapshot?.membershipLookupFailed
            ? null
            : (
                memberships.find(
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
    const homePackageResult =
        snapshot?.homePackageResult ||
        null;

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
        billingProfile =
            await getBillingProfileCached(
                user.id
            );
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
