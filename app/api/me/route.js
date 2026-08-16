import {
    NextResponse
} from 'next/server';

import {
    getCurrentMembership
} from '../../../lib/membership';


export async function GET() {

    try {

        const {
            user,
            membership
        } =
            await getCurrentMembership();


        return NextResponse.json({
            loggedIn:
                Boolean(user),

            user: user
                ? {
                    id:
                        user.id,

                    email:
                        user.email
                }
                : null,

            membership:
                membership
                    ? {
                        plan:
                            membership.plan,

                        status:
                            membership.status,

                        startsAt:
                            membership.starts_at,

                        endsAt:
                            membership.ends_at
                    }
                    : null
        });


    } catch (error) {

        console.error(
            'me error:',
            error
        );


        return NextResponse.json(
            {
                error:
                    '사용자 정보를 확인하지 못했습니다.'
            },
            {
                status: 500
            }
        );

    }

}