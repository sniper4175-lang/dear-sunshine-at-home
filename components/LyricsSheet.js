'use client';

import { useEffect, useState } from 'react';
import SecureDownloadButton from './SecureDownloadButton';

const SOURCE_API = '/api/lyrics-url';

function resourceUrl({ slug, index, download = false }) {
    return (
        `/api/resource-file?source=${encodeURIComponent(SOURCE_API)}` +
        `&slug=${encodeURIComponent(slug)}` +
        `&index=${index}` +
        `&download=${download ? '1' : '0'}`
    );
}

export default function LyricsSheet({
    slug,
    title
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadLyrics() {
            try {
                setLoading(true);
                setError('');
                setMissing(false);

                const response = await fetch(
                    `/api/resource-list?source=${encodeURIComponent(SOURCE_API)}` +
                    `&slug=${encodeURIComponent(slug)}`,
                    {
                        cache: 'no-store'
                    }
                );

                if (response.status === 404) {
                    if (!cancelled) {
                        setMissing(true);
                        setItems([]);
                    }

                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data?.error ||
                        '가사지를 불러오지 못했습니다.'
                    );
                }

                if (!cancelled) {
                    setItems(
                        Array.isArray(data?.items)
                            ? data.items
                            : []
                    );
                }
            } catch (e) {
                if (!cancelled) {
                    setError(
                        e?.message ||
                        '가사지를 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadLyrics();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (!loading && missing) {
        return null;
    }

    if (loading) {
        return (
            <section className="content-card">
                <p className="eyebrow">LYRIC SHEET</p>
                <h2>가사지</h2>
                <p className="muted">
                    가사지를 불러오는 중이에요...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="content-card">
                <p className="eyebrow">LYRIC SHEET</p>
                <h2>가사지</h2>
                <p style={{ color: '#bd3d3d' }}>
                    {error}
                </p>
            </section>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="content-card">
            <p className="eyebrow">LYRIC SHEET</p>
            <h2>가사지</h2>

            <p
                className="muted"
                style={{ marginBottom: 16 }}
            >
                노래를 들으며 가사를 함께 확인해보세요.
            </p>

            <div
                style={{
                    display: 'grid',
                    gap: 18
                }}
            >
                {items.map((item, index) => {
                    const preview = resourceUrl({
                        slug,
                        index,
                        download: false
                    });

                    const download = resourceUrl({
                        slug,
                        index,
                        download: true
                    });

                    return (
                        <div
                            key={`${slug}-lyrics-${index}`}
                        >
                            <img
                                src={preview}
                                alt={`${title} 가사지 ${index + 1}`}
                                loading="lazy"
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: 16,
                                    border: '1px solid #eee3d5'
                                }}
                            />

                            {items.length > 1 && (
                                <div
                                    style={{
                                        marginTop: 8,
                                        color: '#8d8175',
                                        fontSize: 12,
                                        textAlign: 'center'
                                    }}
                                >
                                    {index + 1} / {items.length}
                                </div>
                            )}

                            <div style={{ marginTop: 12 }}>
                                <SecureDownloadButton
                                    url={download}
                                    label={
                                        items.length === 1
                                            ? '⬇ 가사지 다운로드'
                                            : `⬇ ${index + 1}페이지 다운로드`
                                    }
                                    fallbackFilename={
                                        `${title || 'Dear-Sunshine'}-Lyric-Sheet-${index + 1}`
                                    }
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
