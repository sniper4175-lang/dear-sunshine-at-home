import {
    randomUUID
} from 'node:crypto';

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


        const clientKey =
            process.env
                .NEXT_PUBLIC_TOSS_CLIENT_KEY;


        if (!clientKey) {

            return NextResponse.json(
                {
                    error:
                        '토스페이먼츠 클라이언트 키가 설정되지 않았습니다.'
                },
                {
                    status: 500
                }
            );

        }


        const db =
            createAdminSupabase();


        /*
         * 이미 현재 멤버십이 있으면 결제수단 등록을 다시 시작하지 않음.
         */
        const {
            data: currentMembership
        } =
            await db
                .from(
                    'ds_content_memberships'
                )
                .select(
                    'id,status'
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
                        'past_due',
                        'paused'
                    ]
                )
                .maybeSingle();


        if (currentMembership) {

            return NextResponse.json(
                {
                    error:
                        '이미 이용 중인 Song Club 멤버십이 있습니다.'
                },
                {
                    status: 409
                }
            );

        }


        const {
            data: existingProfile,
            error: profileReadError
        } =
            await db
                .from(
                    'ds_billing_profiles'
                )
                .select(
                    'id,customer_key'
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


        if (profileReadError) {
            throw profileReadError;
        }


        const customerKey =
            existingProfile
                ?.customer_key ||
            `ds_${randomUUID()}`;


        if (!existingProfile) {

            const {
                error: insertError
            } =
                await db
                    .from(
                        'ds_billing_profiles'
                    )
                    .insert({
                        user_id:
                            user.id,

                        provider:
                            'tosspayments',

                        customer_key:
                            customerKey,

                        is_active:
                            false
                    });


            if (insertError) {
                throw insertError;
            }

        }


        return NextResponse.json({
            clientKey,
            customerKey,
            customerEmail:
                user.email || ''
        });


    } catch (error) {

        console.error(
            'billing prepare error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '결제수단 등록을 준비하지 못했습니다.'
            },
            {
                status: 500
            }
        );

    }

}
