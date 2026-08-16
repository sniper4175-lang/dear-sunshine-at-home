import {
    createAuthSupabase
} from './supabase-auth-server';

import {
    createAdminSupabase
} from './supabase-server';


export async function getCurrentMembership() {

    /*
     * =====================================
     * 현재 로그인 사용자 확인
     * =====================================
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

        return {
            user: null,
            membership: null
        };

    }


    /*
     * =====================================
     * 사용자의 active 멤버십 조회
     * =====================================
     */

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


    /*
     * =====================================
     * 시작일 / 종료일 실제 검사
     * =====================================
     */

    const now =
        new Date();


    const validMembership =
        (memberships || [])
            .find(
                membership => {

                    /*
                     * 시작일이 미래이면
                     * 아직 이용 불가
                     */
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


                    /*
                     * 종료일이 지났으면
                     * 이용 불가
                     */
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