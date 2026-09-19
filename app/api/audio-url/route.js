import { NextResponse } from 'next/server';

import { createAdminSupabase } from '../../../lib/supabase-server';
import { getCurrentMembership } from '../../../lib/membership';
import { getUserPrograms } from '../../../lib/program-access';
import { canAccessSong } from '../../../lib/content-access';
import { todayKST } from '../../../lib/release-date';

export const dynamic = 'force-dynamic';

function json(data, status = 200) {
    return NextResponse.json(
        data,
        {
            status,
            headers: {
                'Cache-Control':
                    'private, max-age=60, stale-while-revalidate=120'
            }
        }
    );
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = String(
            searchParams.get('slug') || ''
        ).trim();

        if (!slug) {
            return json(
                { error: '음원 정보를 확인해주세요.' },
                400
            );
        }

        const db = createAdminSupabase();

        /*
         * 회원권 확인과 곡 조회를 동시에 실행합니다.
         * Home Package 전용곡은 Song Club 비공개일 수 있으므로
         * 곡 조회 단계에서 is_published=true를 걸지 않습니다.
         */
        const [
            membershipState,
            songResult
        ] = await Promise.all([
            getCurrentMembership({
                includeBillingProfile: false
            }),

            db
                .from('ds_content_songs')
                .select(`
                    id,
                    slug,
                    title,
                    program,
                    audio_path,
                    release_date,
                    is_published
                `)
                .eq('slug', slug)
                .maybeSingle()
        ]);

        const {
            user,
            membership,
            homePackage
        } = membershipState;

        if (!user) {
            return json(
                { error: '로그인이 필요합니다.' },
                401
            );
        }

        const {
            data: song,
            error: songError
        } = songResult;

        if (songError) {
            console.error(
                'audio-url song error:',
                songError
            );

            return json(
                { error: '음원 정보를 확인하지 못했습니다.' },
                500
            );
        }

        if (!song || !song.audio_path) {
            return json(
                { error: '등록된 음원 파일이 없습니다.' },
                404
            );
        }

        const homeUnlockedIds = Array.isArray(
            homePackage?.unlocked_song_ids
        )
            ? homePackage.unlocked_song_ids
            : [];

        const allowedByHomePackage =
            homeUnlockedIds.includes(song.id);

        const publishedForSongClub =
            Boolean(song.is_published) &&
            (
                !song.release_date ||
                String(song.release_date).slice(0, 10) <= todayKST()
            );

        let allowedBySongClub = false;

        if (
            publishedForSongClub &&
            membership &&
            membership?.product_type !== 'home_package' &&
            membership?.song_club_active !== false
        ) {
            let userPrograms = [];

            try {
                userPrograms = await getUserPrograms(
                    db,
                    user.id
                );
            } catch (error) {
                console.error(
                    'audio-url program access error:',
                    error
                );

                return json(
                    { error: '수강 프로그램 권한을 확인하지 못했습니다.' },
                    500
                );
            }

            allowedBySongClub = canAccessSong(
                {
                    id: song.id,
                    program: song.program
                },
                membership,
                userPrograms
            );
        }

        if (
            !allowedByHomePackage &&
            !allowedBySongClub
        ) {
            return json(
                { error: '현재 이용할 수 없는 음원입니다.' },
                403
            );
        }

        const {
            data: signedData,
            error: signedError
        } = await db
            .storage
            .from('dear-sunshine-audio')
            .createSignedUrl(
                song.audio_path,
                60 * 30
            );

        if (
            signedError ||
            !signedData?.signedUrl
        ) {
            console.error(
                'audio-url signed URL error:',
                signedError
            );

            return json(
                { error: '음원 주소를 만들지 못했습니다.' },
                500
            );
        }

        return json({
            url: signedData.signedUrl
        });
    } catch (error) {
        console.error(
            'audio-url error:',
            error
        );

        return json(
            { error: '음원 처리 중 오류가 발생했습니다.' },
            500
        );
    }
}
