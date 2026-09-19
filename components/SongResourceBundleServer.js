import { createAdminSupabase } from '../lib/supabase-server';
import { listSongResourceFiles } from '../lib/storage-resource';

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)$/i;
const PDF_RE = /\.pdf$/i;

function resourceUrl({
    slug,
    kind,
    index,
    download = false
}) {
    const params = new URLSearchParams({
        slug: String(slug || ''),
        kind: String(kind || ''),
        index: String(index || 0)
    });

    if (download) {
        params.set('download', '1');
    }

    return `/api/resource-file?${params.toString()}`;
}

function ResourceSection({
    slug,
    kind,
    eyebrow,
    title,
    description,
    items,
    eagerFirstImage = false
}) {
    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }

    return (
        <section
            className="content-card"
            style={{
                marginTop: 20,
                contentVisibility: 'auto',
                containIntrinsicSize: '420px'
            }}
        >
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>

            {description ? (
                <p className="page-copy">{description}</p>
            ) : null}

            <div
                style={{
                    display: 'grid',
                    gap: 16,
                    marginTop: 14
                }}
            >
                {items.map((item, index) => {
                    const name = String(
                        item?.name ||
                        item?.path ||
                        ''
                    );

                    const isImage = IMAGE_RE.test(name);
                    const isPdf = PDF_RE.test(name);

                    const viewUrl = resourceUrl({
                        slug,
                        kind,
                        index
                    });

                    const downloadUrl = resourceUrl({
                        slug,
                        kind,
                        index,
                        download: true
                    });

                    const numberedTitle =
                        items.length > 1
                            ? `${title} ${index + 1}`
                            : title;

                    return (
                        <div
                            key={`${item?.path || index}-${index}`}
                        >
                            {isImage ? (
                                <a
                                    href={viewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'block'
                                    }}
                                >
                                    <img
                                        src={viewUrl}
                                        alt={numberedTitle}
                                        loading={
                                            eagerFirstImage && index === 0
                                                ? 'eager'
                                                : 'lazy'
                                        }
                                        fetchPriority={
                                            eagerFirstImage && index === 0
                                                ? 'high'
                                                : 'low'
                                        }
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
                                    href={viewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="secondary-button wide"
                                >
                                    {isPdf ? 'PDF 보기' : '자료 보기'}
                                    {items.length > 1 ? ` · ${index + 1}` : ''}
                                </a>
                            )}

                            <a
                                href={downloadUrl}
                                className="secondary-button wide"
                                style={{
                                    marginTop: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none'
                                }}
                            >
                                ↓ {numberedTitle} 다운로드
                            </a>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export function SongResourceFallback({
    scope = 'song-club'
}) {
    const secondTitle =
        scope === 'home-package'
            ? '활동자료'
            : '이렇게 놀아요';

    const secondEyebrow =
        scope === 'home-package'
            ? 'PRINTABLE'
            : 'PLAY IDEAS';

    return (
        <>
            <section
                className="content-card"
                style={{
                    marginTop: 20,
                    minHeight: 150
                }}
            >
                <p className="eyebrow">LYRIC SHEET</p>
                <h2>가사지</h2>
                <p className="page-copy">
                    가사지를 준비하고 있어요...
                </p>
            </section>

            <section
                className="content-card"
                style={{
                    marginTop: 20,
                    minHeight: 150
                }}
            >
                <p className="eyebrow">{secondEyebrow}</p>
                <h2>{secondTitle}</h2>
                <p className="page-copy">
                    자료를 준비하고 있어요...
                </p>
            </section>
        </>
    );
}

export default async function SongResourceBundleServer({
    song,
    scope = 'song-club'
}) {
    if (!song) {
        return null;
    }

    const db = createAdminSupabase();

    const playIdeasBucket =
        String(
            process.env.DEAR_SUNSHINE_PLAY_IDEAS_BUCKET || ''
        ).trim() ||
        'dear-sunshine-play-ideas';

    /*
     * 여기서는 signed URL을 만들지 않습니다.
     * 브라우저 HTML에는 Dear Sunshine의 /api/resource-file 주소만 들어갑니다.
     */
    const [
        lyrics,
        printables,
        playIdeas
    ] = await Promise.all([
        listSongResourceFiles({
            db,
            bucket: 'dear-sunshine-lyrics',
            program: song.program,
            audioPath: song.audioPath || song.audio_path,
            title: song.title,
            legacyPath: song.lyricsPath || song.lyrics_path
        }).catch((error) => {
            console.warn(
                'lyrics resource list failed:',
                error?.message || error
            );
            return [];
        }),

        listSongResourceFiles({
            db,
            bucket: 'dear-sunshine-printables',
            program: song.program,
            audioPath: song.audioPath || song.audio_path,
            title: song.title,
            legacyPath: song.printablePath || song.printable_path
        }).catch((error) => {
            console.warn(
                'printable resource list failed:',
                error?.message || error
            );
            return [];
        }),

        listSongResourceFiles({
            db,
            bucket: playIdeasBucket,
            program: song.program,
            audioPath: song.audioPath || song.audio_path,
            title: song.title,
            legacyPath: song.playIdeasPath || song.play_ideas_path
        }).catch((error) => {
            console.warn(
                'play ideas resource list failed:',
                error?.message || error
            );
            return [];
        })
    ]);

    const lyricSection = (
        <ResourceSection
            slug={song.slug}
            kind="lyrics"
            eyebrow="LYRIC SHEET"
            title="가사지"
            description="노래를 들으며 가사를 함께 확인해보세요."
            items={lyrics}
            eagerFirstImage
        />
    );

    const printableSection = (
        <ResourceSection
            slug={song.slug}
            kind="printables"
            eyebrow="PRINTABLE"
            title={
                scope === 'home-package'
                    ? '활동자료'
                    : '플래시 카드'
            }
            description={
                scope === 'home-package'
                    ? '플래시 카드와 활동자료로 영어놀이를 이어가 보세요.'
                    : '노래와 함께 활용할 수 있는 플래시 카드예요.'
            }
            items={printables}
        />
    );

    const playIdeaSection = (
        <ResourceSection
            slug={song.slug}
            kind="play-ideas"
            eyebrow="PLAY IDEAS"
            title="이렇게 놀아요"
            description={
                scope === 'home-package'
                    ? '노래와 연결된 놀이 아이디어를 함께 활용해보세요.'
                    : '집에서 바로 따라 할 수 있는 활동자료를 확인해보세요.'
            }
            items={playIdeas}
        />
    );

    return scope === 'home-package' ? (
        <>
            {lyricSection}
            {printableSection}
            {playIdeaSection}
        </>
    ) : (
        <>
            {lyricSection}
            {playIdeaSection}
            {printableSection}
        </>
    );
}
