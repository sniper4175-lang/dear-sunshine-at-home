import { NextResponse } from 'next/server';

import {
    createAdminSupabase
} from '../../../lib/supabase-server';

import {
    createAuthSupabase
} from '../../../lib/supabase-auth-server';

export const dynamic =
    'force-dynamic';


const ALLOWED_SOURCES =
    new Set([
        'song_club',
        'home_package',
        'playlist'
    ]);


function json(data, status = 200) {

    return NextResponse.json(
        data,
        { status }
    );

}


export async function POST(request) {

    try {

        const auth =
            await createAuthSupabase();


        const {
            data: claimsData,
            error: claimsError
        } =
            await auth
                .auth
                .getClaims();


        const userId =
            claimsData?.claims?.sub
                ? String(
                    claimsData.claims.sub
                )
                : '';


        if (
            claimsError ||
            !userId
        ) {

            return json(
                { error: '로그인이 필요합니다.' },
                401
            );

        }


        const body =
            await request
                .json()
                .catch(
                    () => null
                );


        const slug =
            String(
                body?.slug ||
                ''
            ).trim();


        const requestedSource =
            String(
                body?.source ||
                ''
            ).trim();


        const source =
            ALLOWED_SOURCES.has(
                requestedSource
            )
                ? requestedSource
                : 'song_club';


        if (!slug) {

            return json(
                { error: '음원 정보를 확인해주세요.' },
                400
            );

        }


        const db =
            createAdminSupabase();


        const {
            data: song,
            error: songError
        } =
            await db
                .from(
                    'ds_content_songs'
                )
                .select(
                    'id,slug'
                )
                .eq(
                    'slug',
                    slug
                )
                .maybeSingle();


        if (songError) {

            console.error(
                'play-history song lookup error:',
                songError
            );


            return json(
                { error: '음원 정보를 확인하지 못했습니다.' },
                500
            );

        }


        if (!song) {

            return json(
                { error: '등록된 음원을 찾지 못했습니다.' },
                404
            );

        }


        const {
            error: insertError
        } =
            await db
                .from(
                    'ds_song_play_history'
                )
                .insert({
                    user_id:
                        userId,

                    song_id:
                        song.id,

                    slug:
                        song.slug,

                    source
                });


        if (insertError) {

            console.error(
                'play-history insert error:',
                insertError
            );


            return json(
                { error: '재생 이력을 저장하지 못했습니다.' },
                500
            );

        }


        return json({
            ok: true
        });

    } catch (error) {

        console.error(
            'play-history error:',
            error
        );


        return json(
            { error: '재생 이력 처리 중 오류가 발생했습니다.' },
            500
        );

    }

}
