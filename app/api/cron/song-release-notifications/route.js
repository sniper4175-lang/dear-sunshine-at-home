import {
    NextResponse
} from 'next/server';

import {
    createAdminSupabase
} from '../../../../lib/supabase-server';


export const dynamic =
    'force-dynamic';


export const maxDuration =
    120;


const SITE_URL =
    'https://songclub.dearsunshine.co.kr';


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


function kstDateString(
    date = new Date()
) {

    return new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone:
                'Asia/Seoul',

            year:
                'numeric',

            month:
                '2-digit',

            day:
                '2-digit'
        }
    ).format(
        date
    );

}


function daysAgoKst(
    dateString,
    days
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split('-')
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day - days
            )
        );


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


function isValidDateRange(
    row,
    now
) {

    if (
        row?.starts_at &&
        new Date(
            row.starts_at
        ) > now
    ) {
        return false;
    }


    if (
        row?.status ===
        'trialing'
    ) {

        const trialEnd =
            row.trial_ends_at ||
            row.current_period_end ||
            row.ends_at;


        if (
            !trialEnd ||
            new Date(
                trialEnd
            ) <= now
        ) {
            return false;
        }

    }


    const effectiveEnd =
        row?.current_period_end ||
        row?.ends_at ||
        null;


    if (
        effectiveEnd &&
        new Date(
            effectiveEnd
        ) <= now
    ) {
        return false;
    }


    return true;

}


async function getSongClubUserIds(
    db,
    program,
    now
) {

    const {
        data: accessRows,
        error: accessError
    } =
        await db
            .from(
                'ds_user_program_access'
            )
            .select(
                'user_id'
            )
            .eq(
                'program',
                program
            );


    if (accessError) {
        throw accessError;
    }


    const userIds =
        Array.from(
            new Set(
                (
                    accessRows ||
                    []
                )
                    .map(
                        row =>
                            row.user_id
                    )
                    .filter(Boolean)
            )
        );


    if (
        userIds.length ===
        0
    ) {
        return [];
    }


    const {
        data: memberships,
        error: membershipError
    } =
        await db
            .from(
                'ds_content_memberships'
            )
            .select(
                `
                user_id,
                status,
                starts_at,
                ends_at,
                trial_ends_at,
                current_period_end
                `
            )
            .in(
                'user_id',
                userIds
            )
            .in(
                'status',
                [
                    'active',
                    'trialing'
                ]
            );


    if (membershipError) {
        throw membershipError;
    }


    return Array.from(
        new Set(
            (
                memberships ||
                []
            )
                .filter(
                    row =>
                        isValidDateRange(
                            row,
                            now
                        )
                )
                .map(
                    row =>
                        row.user_id
                )
                .filter(Boolean)
        )
    );

}


async function getHomePackageUserIds(
    db,
    program,
    now
) {

    const {
        data: programRows,
        error: programError
    } =
        await db
            .from(
                'ds_home_package_user_programs'
            )
            .select(
                'product_id'
            )
            .eq(
                'program',
                program
            );


    if (programError) {

        console.warn(
            '[song push] home package program lookup skipped',
            programError
        );

        return [];
    }


    const productIds =
        Array.from(
            new Set(
                (
                    programRows ||
                    []
                )
                    .map(
                        row =>
                            row.product_id
                    )
                    .filter(Boolean)
            )
        );


    if (
        productIds.length ===
        0
    ) {
        return [];
    }


    const {
        data: products,
        error: productError
    } =
        await db
            .from(
                'ds_user_products'
            )
            .select(
                `
                id,
                user_id,
                product_type,
                status,
                starts_at,
                ends_at
                `
            )
            .in(
                'id',
                productIds
            )
            .eq(
                'product_type',
                'home_package'
            )
            .eq(
                'status',
                'active'
            );


    if (productError) {

        console.warn(
            '[song push] home package lookup skipped',
            productError
        );

        return [];
    }


    return Array.from(
        new Set(
            (
                products ||
                []
            )
                .filter(
                    row =>
                        isValidDateRange(
                            row,
                            now
                        )
                )
                .map(
                    row =>
                        row.user_id
                )
                .filter(Boolean)
        )
    );

}


async function getEligibleUserIds(
    db,
    program,
    now
) {

    const [
        songClubIds,
        homePackageIds
    ] =
        await Promise.all([
            getSongClubUserIds(
                db,
                program,
                now
            ),
            getHomePackageUserIds(
                db,
                program,
                now
            )
        ]);


    return Array.from(
        new Set([
            ...songClubIds,
            ...homePackageIds
        ])
    );

}


function chunks(
    values,
    size
) {

    const result =
        [];


    for (
        let index = 0;
        index < values.length;
        index += size
    ) {

        result.push(
            values.slice(
                index,
                index + size
            )
        );

    }


    return result;

}


async function sendOneSignalPush({
    externalIds,
    program,
    songs,
    today
}) {

    const appId =
        process.env
            .NEXT_PUBLIC_ONESIGNAL_APP_ID;

    const apiKey =
        process.env
            .ONESIGNAL_REST_API_KEY;


    if (
        !appId ||
        !apiKey
    ) {

        throw new Error(
            'OneSignal 환경변수가 설정되지 않았습니다.'
        );

    }


    if (
        externalIds.length ===
        0
    ) {

        return {
            sent:
                0,

            messageIds:
                []
        };

    }


    const titles =
        songs
            .map(
                song =>
                    song.title
            )
            .filter(Boolean);


    const heading =
        '🎵 이번 주 신곡이 열렸어요!';


    const content =
        titles.length ===
        1
            ? `${titles[0]} · ${program}\nDear Sunshine에서 바로 들어보세요 💛`
            : `${program} 신곡 ${titles.length}곡이 열렸어요.\nDear Sunshine에서 확인해보세요 💛`;


    const messageIds =
        [];


    for (
        const batch of chunks(
            externalIds,
            2000
        )
    ) {

        const response =
            await fetch(
                'https://api.onesignal.com/notifications',
                {
                    method:
                        'POST',

                    headers: {
                        'Content-Type':
                            'application/json; charset=utf-8',

                        Authorization:
                            `Key ${apiKey}`
                    },

                    body:
                        JSON.stringify({
                            app_id:
                                appId,

                            target_channel:
                                'push',

                            include_aliases: {
                                external_id:
                                    batch
                            },

                            name:
                                `Dear Sunshine weekly songs ${today} ${program}`,

                            headings: {
                                en:
                                    heading
                            },

                            contents: {
                                en:
                                    content
                            },

                            url:
                                `${SITE_URL}/library`
                        })
                }
            );


        const result =
            await response
                .json()
                .catch(
                    () => ({})
                );


        if (
            !response.ok
        ) {

            throw new Error(
                result?.errors
                    ? JSON.stringify(
                        result.errors
                    )
                    : `OneSignal HTTP ${response.status}`
            );

        }


        if (
            result?.id
        ) {
            messageIds.push(
                result.id
            );
        }

    }


    return {
        sent:
            externalIds.length,

        messageIds
    };

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
                status:
                    401
            }
        );

    }


    try {

        const db =
            createAdminSupabase();

        const now =
            new Date();

        const today =
            kstDateString(
                now
            );

        const weekStart =
            daysAgoKst(
                today,
                6
            );


        const {
            data: songs,
            error: songError
        } =
            await db
                .from(
                    'ds_content_songs'
                )
                .select(
                    `
                    id,
                    slug,
                    title,
                    program,
                    release_date,
                    push_notified_at
                    `
                )
                .gte(
                    'release_date',
                    weekStart
                )
                .lte(
                    'release_date',
                    today
                )
                .is(
                    'push_notified_at',
                    null
                )
                .order(
                    'release_date',
                    {
                        ascending:
                            true
                    }
                );


        if (songError) {
            throw songError;
        }


        const grouped =
            new Map();


        for (
            const song of songs || []
        ) {

            if (
                !song?.program ||
                !song?.id
            ) {
                continue;
            }


            if (
                !grouped.has(
                    song.program
                )
            ) {
                grouped.set(
                    song.program,
                    []
                );
            }


            grouped.get(
                song.program
            ).push(
                song
            );

        }


        const results =
            [];


        for (
            const [
                program,
                programSongs
            ] of grouped.entries()
        ) {

            const userIds =
                await getEligibleUserIds(
                    db,
                    program,
                    now
                );


            const sendResult =
                await sendOneSignalPush({
                    externalIds:
                        userIds,

                    program,
                    songs:
                        programSongs,

                    today
                });


            const songIds =
                programSongs.map(
                    song =>
                        song.id
                );


            const {
                error: updateError
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .update({
                        push_notified_at:
                            new Date()
                                .toISOString()
                    })
                    .in(
                        'id',
                        songIds
                    );


            if (updateError) {
                throw updateError;
            }


            results.push({
                program,
                songs:
                    programSongs.map(
                        song => ({
                            id:
                                song.id,

                            title:
                                song.title,

                            slug:
                                song.slug
                        })
                    ),

                eligibleUsers:
                    userIds.length,

                oneSignalMessageIds:
                    sendResult.messageIds
            });

        }


        return NextResponse.json({
            ok:
                true,

            today,
            weekStart,
            groups:
                results
        });

    } catch (error) {

        console.error(
            '[song release push cron] failed',
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error?.message ||
                    '신곡 알림 발송에 실패했습니다.'
            },
            {
                status:
                    500
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
