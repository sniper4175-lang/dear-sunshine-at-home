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
                created_at
                `
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
                        membership.starts_at
                    ) {

                        const startsAt =
                            new Date(
                                membership.starts_at
                            );


                        if (
                            startsAt >
                            now
                        ) {
                            return false;
                        }

                    }


                    if (
                        membership.ends_at
                    ) {

                        const endsAt =
                            new Date(
                                membership.ends_at
                            );


                        if (
                            endsAt <
                            now
                        ) {
                            return false;
                        }

                    }


                    return true;

                }
            ) || null;


    return {
        user,
        membership:
            validMembership
    };

}
