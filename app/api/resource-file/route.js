import { NextResponse } from 'next/server';

import { createAdminSupabase } from '../../../lib/supabase-server';
import { todayKST } from '../../../lib/release-date';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * 브라우저가 Supabase signed URL로 직접 이동하지 않도록
 * Dear Sunshine 서버가 파일을 대신 받아서 전달합니다.
 *
 * 기존 /api/*-url API가 로그인/멤버십/프로그램 권한을
 * 검사하고 있으므로, 그 API를 같은 쿠키로 서버에서 호출합니다.
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

function safeFilename(value) {
    return String(value || '')
        .replace(/[\r\n]/g, '')
        .replace(/[\\/]/g, '-')
        .trim();
}

function filenameFromRemoteUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const raw = pathname.split('/').pop() || '';

        return safeFilename(
            decodeURIComponent(raw)
        );
    } catch {
        return '';
    }
}

function extensionOf(filename) {
    const match = String(filename || '').match(/(\.[a-z0-9]{1,10})$/i);
    return match?.[1] || '';
}

function chooseFilename(item, remoteUrl, index) {
    const remoteFilename = filenameFromRemoteUrl(remoteUrl);
    const itemName = safeFilename(item?.name);

    if (itemName) {
        if (extensionOf(itemName)) {
            return itemName;
        }

        const remoteExtension = extensionOf(remoteFilename);

        return remoteExtension
            ? `${itemName}${remoteExtension}`
            : itemName;
    }

    if (remoteFilename) {
        return remoteFilename;
    }

    return `Dear-Sunshine-Resource-${index + 1}`;
}

function asciiFallback(filename) {
    const ext = extensionOf(filename);

    return `Dear-Sunshine-Resource${ext}`;
}

function encodeRFC5987(value) {
    return encodeURIComponent(value)
        .replace(/['()]/g, escape)
        .replace(/\*/g, '%2A');
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

        const indexValue = Number(
            searchParams.get('index') || 0
        );

        const download =
            searchParams.get('download') === '1';

        const index =
            Number.isInteger(indexValue) && indexValue >= 0
                ? indexValue
                : 0;

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

        const sourceItems = Array.isArray(data?.items)
            ? data.items.filter(item => item?.url)
            : data?.url
                ? [
                    {
                        name: '',
                        url: data.url
                    }
                ]
                : [];

        const item = sourceItems[index];

        if (!item?.url) {
            return NextResponse.json(
                {
                    error: '다운로드할 자료가 없습니다.'
                },
                {
                    status: 404
                }
            );
        }

        const remoteResponse = await fetch(item.url, {
            method: 'GET',
            cache: 'no-store'
        });

        if (!remoteResponse.ok || !remoteResponse.body) {
            return NextResponse.json(
                {
                    error: '파일을 불러오지 못했습니다.'
                },
                {
                    status: 502
                }
            );
        }

        const filename = chooseFilename(
            item,
            item.url,
            index
        );

        const dispositionType =
            download ? 'attachment' : 'inline';

        const headers = new Headers();

        headers.set(
            'content-type',
            remoteResponse.headers.get('content-type') ||
            'application/octet-stream'
        );

        headers.set(
            'content-disposition',
            `${dispositionType}; filename="${asciiFallback(filename)}"; ` +
            `filename*=UTF-8''${encodeRFC5987(filename)}`
        );

        headers.set(
            'cache-control',
            'private, no-store'
        );

        headers.set(
            'x-content-type-options',
            'nosniff'
        );

        return new Response(
            remoteResponse.body,
            {
                status: 200,
                headers
            }
        );
    } catch (e) {
        console.error('resource-file error:', e);

        return NextResponse.json(
            {
                error: '파일을 불러오지 못했습니다.'
            },
            {
                status: 500
            }
        );
    }
}
