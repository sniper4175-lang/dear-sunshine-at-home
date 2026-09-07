import {
    NextResponse
} from 'next/server';

import {
    runRecurringBilling
} from '../../../../lib/recurring-billing';


export const dynamic =
    'force-dynamic';


export const maxDuration =
    120;


function isAuthorized(
    request
) {

    const secret =
        process.env
            .CRON_SECRET;


    if (!secret) {
        return false;
    }


    return request.headers
        .get(
            'authorization'
        ) ===
        `Bearer ${secret}`;
}


async function handle(
    request
) {

    if (
        !isAuthorized(
            request
        )
    ) {
        return NextResponse.json(
            {
                error:
                    'Unauthorized'
            },
            {
                status: 401
            }
        );
    }


    try {

        const result =
            await runRecurringBilling({
                limit: 20
            });


        return NextResponse.json({
            ok: true,
            ...result
        });

    } catch (error) {

        console.error(
            '[billing cron] failed',
            error
        );


        return NextResponse.json(
            {
                ok: false,
                error:
                    error?.message ||
                    '자동결제 작업에 실패했습니다.'
            },
            {
                status: 500
            }
        );
    }
}


export async function GET(
    request
) {
    return handle(
        request
    );
}


export async function POST(
    request
) {
    return handle(
        request
    );
}
