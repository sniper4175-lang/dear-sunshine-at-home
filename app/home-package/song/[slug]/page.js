import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentMembership } from '../../../../lib/membership';
import { createAdminSupabase } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;
const PDF_RE = /\.pdf$/i;

function basenameWithoutExtension(pathValue) {
    const name = String(pathValue || '')
        .split('/')
        .pop() || '';

    return name.replace(/\.[^.]+$/, '').trim();
}

function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
}

async function listFirstExistingFolder(db, bucket, candidates) {
    for (const folder of unique(candidates)) {
        try {
            const { data, error } = await db.storage
                .from(bucket)
                .list(folder, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) {
                continue;
            }

            const files = (data || [])
                .filter((item) => item.id !== null)
                .map((item) => ({
                    name: item.name,
                    path: `${folder}/${item.name}`
                }));

            if (files.length) {
                return files;
            }
        } catch (error) {
            console.warn(`Home Package resource list failed: ${bucket}/${folder}`, error);
        }
    }

    return [];
}

async function signFiles(db, bucket, files) {
    const rows = await Promise.all(
        (files || []).map(async (file) => {
            const { data, error } = await db.storage
                .from(bucket)
                .createSignedUrl(file.path, 60 * 60);

            if (error || !data?.signedUrl) {
                return null;
            }

            return {
                ...file,
                url: data.signedUrl
            };
        })
    );

    return rows.filter(Boolean);
}

async function signOne(db, bucket, pathValue) {
    if (!pathValue) {
        return '';
    }

    const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrl(pathValue, 60 * 60);

    if (error || !data?.signedUrl) {
        return '';
    }

    return data.signedUrl;
}

function ResourceSection({ eyebrow, title, description, files }) {
    if (!files?.length) {
        return null;
    }

    return (
        <section className="content-card" style={{ marginTop: 20 }}>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            {description && (
                <p className="page-copy">{description}</p>
            )}

            <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
                {files.map((file, index) => (
                    <div key={`${file.path}-${index}`}>
                        {IMAGE_RE.test(file.name) ? (
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'block' }}
                            >
                                <img
                                    src={file.url}
                                    alt={`${title} ${index + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: 16,
                                        border: '1px solid rgba(0,0,0,0.08)'
                                    }}
                                />
                            </a>
                        ) : (
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="secondary-button wide"
                            >
                                {PDF_RE.test(file.name) ? 'PDF 보기' : '자료 보기'} · {index + 1}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

export default async function HomePackageSongPage({ params }) {
    const { slug } = await params;

    const {
        user,
        homePackage
    } = await getCurrentMembership();

    if (!user) {
        redirect(`/login?next=/home-package/song/${encodeURIComponent(slug)}`);
    }

    if (!homePackage) {
        redirect('/home-package');
    }

    const db = createAdminSupabase();

    const { data: row, error } = await db
        .from('ds_content_songs')
        .select(`
            id,
            slug,
            title,
            subtitle,
            program,
            category,
            emoji,
            audio_path,
            lyrics,
            activities,
            is_published
        `)
        .eq('slug', slug)
        .maybeSingle();

    if (error || !row) {
        notFound();
    }

    const unlockedIds = Array.isArray(homePackage.unlocked_song_ids)
        ? homePackage.unlocked_song_ids
        : [];

    /*
     * 핵심 보안 규칙:
     * Song Club 공개 여부(is_published)는 보지 않습니다.
     * 현재 Home Package에서 실제로 열린 song_id인지로만 접근을 허용합니다.
     */
    if (!unlockedIds.includes(row.id)) {
        return (
            <section className="section top-section">
                <Link className="back-link" href="/home-package">
                    ← Home Package
                </Link>
                <div className="content-card" style={{ textAlign: 'center', marginTop: 18 }}>
                    <div style={{ fontSize: 42, marginBottom: 10 }}>🔒</div>
                    <h2>아직 열리지 않은 노래예요</h2>
                    <p className="page-copy">
                        Home Package 시작일과 주차에 맞춰 자동으로 공개됩니다.
                    </p>
                </div>
            </section>
        );
    }

    const contentKey = basenameWithoutExtension(row.audio_path) || row.title;
    const candidates = [
        `${row.program}/${contentKey}`,
        `${row.program}/${row.title}`,
        contentKey,
        row.title
    ];

    const playIdeasBucket =
        String(process.env.DEAR_SUNSHINE_PLAY_IDEAS_BUCKET || '').trim() ||
        'dear-sunshine-play-ideas';

    const [
        audioUrl,
        lyricFilesRaw,
        printableFilesRaw,
        playIdeaFilesRaw
    ] = await Promise.all([
        signOne(db, 'dear-sunshine-audio', row.audio_path),
        listFirstExistingFolder(db, 'dear-sunshine-lyrics', candidates),
        listFirstExistingFolder(db, 'dear-sunshine-printables', candidates),
        listFirstExistingFolder(db, playIdeasBucket, candidates)
    ]);

    const [lyricsFiles, printableFiles, playIdeaFiles] = await Promise.all([
        signFiles(db, 'dear-sunshine-lyrics', lyricFilesRaw),
        signFiles(db, 'dear-sunshine-printables', printableFilesRaw),
        signFiles(db, playIdeasBucket, playIdeaFilesRaw)
    ]);

    return (
        <section className="song-page">
            <Link className="back-link" href="/home-package">
                ← Home Package
            </Link>

            <div className="song-cover large">
                <span>{row.emoji || '🎵'}</span>
            </div>

            {row.program && (
                <p className="eyebrow">{row.program}</p>
            )}

            {row.category && (
                <p className="eyebrow" style={{ marginTop: 4 }}>
                    {row.category}
                </p>
            )}

            <h1>{row.title}</h1>

            {row.subtitle && (
                <p className="page-copy">{row.subtitle}</p>
            )}

            <div
                style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 20,
                    background: '#3f2e22',
                    color: '#fff'
                }}
            >
                <strong style={{ display: 'block', marginBottom: 10 }}>
                    🎵 {row.title}
                </strong>
                {audioUrl ? (
                    <audio
                        controls
                        preload="metadata"
                        src={audioUrl}
                        style={{ width: '100%' }}
                    />
                ) : (
                    <p style={{ margin: 0, opacity: 0.8 }}>
                        음원을 불러오지 못했습니다.
                    </p>
                )}
            </div>

            <ResourceSection
                eyebrow="LYRIC SHEET"
                title="가사지"
                description="노래를 들으며 가사를 함께 확인해보세요."
                files={lyricsFiles}
            />

            <ResourceSection
                eyebrow="PRINTABLE"
                title="활동자료"
                description="플래시 카드와 활동자료로 영어놀이를 이어가 보세요."
                files={printableFiles}
            />

            <ResourceSection
                eyebrow="PLAY IDEAS"
                title="이렇게 놀아요"
                description="노래와 연결된 놀이 아이디어를 함께 활용해보세요."
                files={playIdeaFiles}
            />

            {Array.isArray(row.lyrics) && row.lyrics.length > 0 && (
                <section className="content-card" style={{ marginTop: 20 }}>
                    <p className="eyebrow">LYRICS</p>
                    <h2>가사</h2>
                    <div className="lyrics">
                        {row.lyrics.map((line, index) => (
                            <p key={index}>{line}</p>
                        ))}
                    </div>
                </section>
            )}

            {Array.isArray(row.activities) && row.activities.length > 0 && (
                <section className="content-card" style={{ marginTop: 20 }}>
                    <p className="eyebrow">HOME PACKAGE</p>
                    <h2>이 노래로 놀아요</h2>
                    <div className="steps">
                        {row.activities.map((activity, index) => (
                            <div className="step" key={`${row.slug}-${index}`}>
                                <span>{index + 1}</span>
                                <div>
                                    <strong>{activity.title}</strong>
                                    <p>{activity.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </section>
    );
}
