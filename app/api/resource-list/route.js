import { NextResponse } from 'next/server';

import { createAdminSupabase } from '../../../lib/supabase-server';
import { todayKST } from '../../../lib/release-date';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * 이 API는 Supabase signed URL을 브라우저에 보내지 않습니다.
 * 기존 자료 URL API를 서버에서 호출한 뒤,
 * 브라우저에는 파일 개수/이름만 전달합니다.
 */

function isAllowedSource(source) {
    if (!source) {
        return false;
    }

    if (!/^\/api\/[a-z0-9-]+-url$/i.test(source)) {
        return false;
    }

    const blocked = new Set([
        '/api/audio-url',
        '/api/resource-file-url',
        '/api/resource-list-url'
    ]);

    return !blocked.has(source.toLowerCase());
}

async function getSourceData(request, source, slug) {
    const target = new URL(source, request.url);
    target.searchParams.set('slug', slug);

    const cookie = request.headers.get('cookie') || '';

    const response = await fetch(target, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            cookie,
            accept: 'application/json'
        }
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return {
        response,
        data
    };
}

async function checkReleasedSong(slug) {
    const db = createAdminSupabase();

    const { data, error } =
        await db
            .from('ds_content_songs')
            .select('slug')
            .eq('slug', slug)
            .eq('is_published', true)
            .lte('release_date', todayKST())
            .maybeSingle();

    if (error) {
        throw error;
    }

    return Boolean(data);
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const source = String(
            searchParams.get('source') || ''
        ).trim();

        const slug = String(
            searchParams.get('slug') || ''
        ).trim();

        if (!isAllowedSource(source)) {
            return NextResponse.json(
                {
                    error: '허용되지 않은 자료 요청입니다.'
                },
                {
                    status: 400
                }
            );
        }

        if (!slug) {
            return NextResponse.json(
                {
                    error: '콘텐츠 정보를 확인해주세요.'
                },
                {
                    status: 400
                }
            );
        }

        const released =
            await checkReleasedSong(
                slug
            );

        if (!released) {
            return NextResponse.json(
                {
                    error: '아직 공개되지 않은 콘텐츠입니다.'
                },
                {
                    status: 404
                }
            );
        }


        const {
            response,
            data
        } = await getSourceData(
            request,
            source,
            slug
        );

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        data?.error ||
                        '자료를 불러오지 못했습니다.'
                },
                {
                    status: response.status
                }
            );
        }

        let items = [];

        if (Array.isArray(data?.items)) {
            items = data.items
                .filter(item => item?.url)
                .map((item, index) => ({
                    index,
                    name:
                        String(item?.name || '').trim() ||
                        `자료 ${index + 1}`
                }));
        } else if (data?.url) {
            items = [
                {
                    index: 0,
                    name: '자료 1'
                }
            ];
        }

        return NextResponse.json(
            {
                ok: true,
                items
            },
            {
                headers: {
                    'cache-control': 'private, no-store'
                }
            }
        );
    } catch (e) {
        console.error('resource-list error:', e);

        return NextResponse.json(
            {
                error: '자료 정보를 불러오지 못했습니다.'
            },
            {
                status: 500
            }
        );
    }
}
