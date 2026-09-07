import {
    createAuthSupabase
} from './supabase-auth-server';

import {
    createAdminSupabase
} from './supabase-server';


export async function getCurrentMembership() {

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
            membership: null
        };

    }


    const db =
        createAdminSupabase();


    const {
        data: memberships,
        error
    } =
        await db
            .from(
                'ds_content_memberships'
            )
            .select(
                `
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
                    'active'
                ]
            )
            .order(
                'created_at',
                {
                    ascending:
                        false
                }
            );


    if (error) {

        console.error(
            'membership error:',
            error
        );


        return {
            user,
            membership: null
        };

    }


    const now =
        new Date();


    const validMembership =
        (memberships || [])
            .find(
                membership => {

                    if (
                        membership.starts_at &&
                        new Date(
                            membership.starts_at
                        ) >
                        now
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
                            ) <=
                            now
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
                            ) <=
                            now
                        ) {
                            return false;
                        }
                    }


                    if (
                        membership.ends_at &&
                        new Date(
                            membership.ends_at
                        ) <=
                        now
                    ) {
                        return false;
                    }


                    return true;

                }
            ) || null;


    let billingProfile =
        null;


    if (validMembership) {

        const {
            data: profile,
            error: profileError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
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
                profile ||
                null;
        }
    }


    return {
        user,
        membership:
            validMembership,
        billingProfile
    };

}
