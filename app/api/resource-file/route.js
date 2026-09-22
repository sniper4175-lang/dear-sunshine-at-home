import { NextResponse } from 'next/server';

import { createAdminSupabase } from '../../../lib/supabase-server';
import { getCurrentMembership } from '../../../lib/membership';
import { getUserPrograms } from '../../../lib/program-access';
import { canAccessSong } from '../../../lib/content-access';
import { listSongResourceFiles } from '../../../lib/storage-resource';
import { todayKST } from '../../../lib/release-date';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESOURCE_KINDS = {
    lyrics: {
        bucket: 'dear-sunshine-lyrics',
        legacyField: 'lyrics_path'
    },
    printables: {
        bucket: 'dear-sunshine-printables',
        legacyField: 'printable_path'
    },
    'play-ideas': {
        bucket: null,
        legacyField: 'play_ideas_path'
    }
};

function safeFilename(value) {
    return String(value || '')
        .replace(/[\r\n]/g, '')
        .replace(/[\\/]/g, '-')
        .trim();
}

function extensionOf(filename) {
    const match = String(filename || '')
        .match(/(\.[a-z0-9]{1,10})$/i);

    return match?.[1] || '';
}


function contentTypeFromFilename(filename) {
    const ext = extensionOf(filename).toLowerCase();

    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.webp':
            return 'image/webp';
        case '.gif':
            return 'image/gif';
        case '.avif':
            return 'image/avif';
        case '.pdf':
            return 'application/pdf';
        default:
            return '';
    }
}

function resolvedContentType(remoteResponse, filename) {
    const remoteType = String(
        remoteResponse.headers.get('content-type') || ''
    )
        .split(';')[0]
        .trim()
        .toLowerCase();

    const genericTypes = new Set([
        '',
        'application/octet-stream',
        'binary/octet-stream',
        'application/binary'
    ]);

    if (!genericTypes.has(remoteType)) {
        return remoteType;
    }

    return (
        contentTypeFromFilename(filename) ||
        'application/octet-stream'
    );
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

function filenameFromRemoteUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const raw = pathname.split('/').pop() || '';
        return safeFilename(decodeURIComponent(raw));
    } catch {
        return '';
    }
}

function chooseFilename(item, remoteUrl, index) {
    const itemName = safeFilename(item?.name);
    const remoteName = filenameFromRemoteUrl(remoteUrl);

    if (itemName) {
        if (extensionOf(itemName)) {
            return itemName;
        }

        const ext = extensionOf(remoteName);
        return ext ? `${itemName}${ext}` : itemName;
    }

    if (remoteName) {
        return remoteName;
    }

    return `Dear-Sunshine-Resource-${index + 1}`;
}

async function proxyRemoteFile({
    remoteUrl,
    item,
    index,
    download
}) {
    const remoteResponse = await fetch(remoteUrl, {
        method: 'GET',
        cache: 'no-store'
    });

    if (!remoteResponse.ok || !remoteResponse.body) {
        return NextResponse.json(
            { error: '파일을 불러오지 못했습니다.' },
            { status: 502 }
        );
    }

    const filename = chooseFilename(
        item,
        remoteUrl,
        index
    );

    const headers = new Headers();

    headers.set(
        'content-type',
        resolvedContentType(
            remoteResponse,
            filename
        )
    );

    headers.set(
        'content-disposition',
        `${download ? 'attachment' : 'inline'}; ` +
        `filename="${asciiFallback(filename)}"; ` +
        `filename*=UTF-8''${encodeRFC5987(filename)}`
    );

    headers.set(
        'cache-control',
        download
            ? 'private, no-store'
            : 'private, max-age=60, stale-while-revalidate=300'
    );

    headers.set('x-content-type-options', 'nosniff');

    const length = remoteResponse.headers.get('content-length');
    if (length) {
        headers.set('content-length', length);
    }

    return new Response(
        remoteResponse.body,
        {
            status: 200,
            headers
        }
    );
}

function isSongClubPublished(song) {
    if (!song?.is_published) {
        return false;
    }

    if (!song.release_date) {
        return true;
    }

    return String(song.release_date).slice(0, 10) <= todayKST();
}

async function userCanAccessSong({
    db,
    song,
    user,
    membership,
    songClubMembership,
    homePackage
}) {
    const accountBonusSongIds = Array.isArray(
        membership?.account_bonus_song_ids
    )
        ? membership.account_bonus_song_ids
        : [];

    if (accountBonusSongIds.includes(song.id)) {
        return true;
    }

    const unlockedHomeSongIds = Array.isArray(
        homePackage?.unlocked_song_ids
    )
        ? homePackage.unlocked_song_ids
        : [];

    if (unlockedHomeSongIds.includes(song.id)) {
        return true;
    }

    if (
        !songClubMembership ||
        !isSongClubPublished(song)
    ) {
        return false;
    }

    let userPrograms = [];

    try {
        userPrograms = await getUserPrograms(
            db,
            user.id
        );
    } catch (error) {
        console.error(
            'resource-file program access error:',
            error
        );
        return false;
    }

    return canAccessSong(
        {
            id: song.id,
            program: song.program
        },
        membership || songClubMembership,
        userPrograms
    );
}

async function handleDirectResource(request, searchParams) {
    const slug = String(
        searchParams.get('slug') || ''
    ).trim();

    const kind = String(
        searchParams.get('kind') || ''
    ).trim();

    const config = RESOURCE_KINDS[kind];

    if (!slug || !config) {
        return NextResponse.json(
            { error: '자료 정보를 확인해주세요.' },
            { status: 400 }
        );
    }

    const indexValue = Number(
        searchParams.get('index') || 0
    );

    const index =
        Number.isInteger(indexValue) && indexValue >= 0
            ? indexValue
            : 0;

    const download =
        searchParams.get('download') === '1';

    const db = createAdminSupabase();

    const [
        membershipState,
        songResult
    ] = await Promise.all([
        getCurrentMembership({
            includeBillingProfile: false
        }),
        db
            .from('ds_content_songs')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()
    ]);

    const {
        user,
        membership,
        songClubMembership,
        homePackage
    } = membershipState;

    if (!user) {
        return NextResponse.json(
            { error: '로그인이 필요합니다.' },
            { status: 401 }
        );
    }

    const {
        data: song,
        error: songError
    } = songResult;

    if (songError) {
        console.error(
            'resource-file song lookup error:',
            songError
        );

        return NextResponse.json(
            { error: '콘텐츠 정보를 확인하지 못했습니다.' },
            { status: 500 }
        );
    }

    if (!song) {
        return NextResponse.json(
            { error: '콘텐츠를 찾을 수 없습니다.' },
            { status: 404 }
        );
    }

    const allowed = await userCanAccessSong({
        db,
        song,
        user,
        membership,
        songClubMembership,
        homePackage
    });

    if (!allowed) {
        return NextResponse.json(
            { error: '현재 이용할 수 없는 자료입니다.' },
            { status: 403 }
        );
    }

    const bucket =
        kind === 'play-ideas'
            ? (
                String(
                    process.env.DEAR_SUNSHINE_PLAY_IDEAS_BUCKET || ''
                ).trim() ||
                'dear-sunshine-play-ideas'
            )
            : config.bucket;

    const items = await listSongResourceFiles({
        db,
        bucket,
        program: song.program,
        audioPath: song.audio_path,
        title: song.title,
        legacyPath: song[config.legacyField]
    });

    const item = items[index];

    if (!item?.path) {
        return NextResponse.json(
            { error: '요청한 자료를 찾을 수 없습니다.' },
            { status: 404 }
        );
    }

    const {
        data: signedData,
        error: signedError
    } = await db.storage
        .from(bucket)
        .createSignedUrl(
            item.path,
            60 * 5
        );

    if (
        signedError ||
        !signedData?.signedUrl
    ) {
        console.error(
            'resource-file sign error:',
            signedError
        );

        return NextResponse.json(
            { error: '자료를 불러오지 못했습니다.' },
            { status: 500 }
        );
    }

    return proxyRemoteFile({
        remoteUrl: signedData.signedUrl,
        item,
        index,
        download
    });
}

/*
 * 예전 컴포넌트 호환용 source 모드입니다.
 * 새 화면은 kind=lyrics|printables|play-ideas 모드를 사용합니다.
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

async function handleLegacySource(request, searchParams) {
    const source = String(
        searchParams.get('source') || ''
    ).trim();

    const slug = String(
        searchParams.get('slug') || ''
    ).trim();

    if (!isAllowedSource(source) || !slug) {
        return NextResponse.json(
            { error: '허용되지 않은 자료 요청입니다.' },
            { status: 400 }
        );
    }

    const indexValue = Number(
        searchParams.get('index') || 0
    );

    const index =
        Number.isInteger(indexValue) && indexValue >= 0
            ? indexValue
            : 0;

    const download =
        searchParams.get('download') === '1';

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
            { error: '요청한 자료가 없습니다.' },
            { status: 404 }
        );
    }

    return proxyRemoteFile({
        remoteUrl: item.url,
        item,
        index,
        download
    });
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        if (searchParams.get('kind')) {
            return await handleDirectResource(
                request,
                searchParams
            );
        }

        return await handleLegacySource(
            request,
            searchParams
        );
    } catch (error) {
        console.error(
            'resource-file error:',
            error
        );

        return NextResponse.json(
            { error: '파일을 불러오지 못했습니다.' },
            { status: 500 }
        );
    }
}
