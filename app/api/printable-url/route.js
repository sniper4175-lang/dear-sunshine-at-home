import { NextResponse } from 'next/server';

import { createAdminSupabase } from '../../../lib/supabase-server';
import { getCurrentMembership } from '../../../lib/membership';
import { getUserPrograms } from '../../../lib/program-access';
import { canAccessSong } from '../../../lib/content-access';
import { createSongResourceSignedUrls } from '../../../lib/storage-resource';
import { todayKST } from '../../../lib/release-date';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { user, membership } = await getCurrentMembership();

        if (!user) {
            return NextResponse.json(
                { error: '로그인이 필요합니다.' },
                { status: 401 }
            );
        }

        if (!membership) {
            return NextResponse.json(
                { error: '이용 가능한 Song Club 멤버십이 없습니다.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const slug = String(searchParams.get('slug') || '').trim();

        if (!slug) {
            return NextResponse.json(
                { error: '곡 정보가 없습니다.' },
                { status: 400 }
            );
        }

        const db = createAdminSupabase();

        const { data: song, error: songError } =
            await db
                .from('ds_content_songs')
                .select(`
                    id,
                    slug,
                    title,
                    program,
                    audio_path,
                    printable_path,
                    release_date,
                    is_published
                `)
                .eq('slug', slug)
                .eq('is_published', true)
                .lte('release_date', todayKST())
                .maybeSingle();

        if (songError) {
            console.error('printable-url song error:', songError);
            return NextResponse.json(
                { error: '플래시 카드 정보를 확인하지 못했습니다.' },
                { status: 500 }
            );
        }

        if (!song) {
            return NextResponse.json(
                { error: '아직 공개되지 않았거나 곡 정보를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        let userPrograms;

        try {
            userPrograms = await getUserPrograms(db, user.id);
        } catch (error) {
            console.error('printable-url program access error:', error);
            return NextResponse.json(
                { error: '수강 프로그램 권한을 확인하지 못했습니다.' },
                { status: 500 }
            );
        }

        if (
            !canAccessSong(
                { id: song.id, program: song.program },
                membership,
                userPrograms
            )
        ) {
            return NextResponse.json(
                { error: `${song.program} 수강 회원만 이용할 수 있는 플래시 카드입니다.` },
                { status: 403 }
            );
        }

        const items = await createSongResourceSignedUrls({
            db,
            bucket: 'dear-sunshine-printables',
            program: song.program,
            audioPath: song.audio_path,
            title: song.title,
            legacyPath: song.printable_path,
            expiresIn: 60 * 30
        });

        if (items.length === 0) {
            return NextResponse.json(
                { error: '등록된 플래시 카드 파일이 없습니다.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            items,
            url: items[0]?.url || null
        });
    } catch (error) {
        console.error('printable-url error:', error);
        return NextResponse.json(
            { error: '플래시 카드 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
