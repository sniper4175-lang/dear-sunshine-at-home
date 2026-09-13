'use client';

import { useEffect, useState } from 'react';
import SecureDownloadButton from './SecureDownloadButton';

function resourceFileUrl({
    apiPath,
    slug,
    index,
    download = false
}) {
    return (
        `/api/resource-file?source=${encodeURIComponent(apiPath)}` +
        `&slug=${encodeURIComponent(slug)}` +
        `&index=${index}` +
        `&download=${download ? '1' : '0'}`
    );
}

export default function ResourceGallery({
    slug,
    apiPath,
    eyebrow,
    title,
    description,
    emptyMessage
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError('');

                const response = await fetch(
                    `/api/resource-list?source=${encodeURIComponent(apiPath)}` +
                    `&slug=${encodeURIComponent(slug)}`,
                    {
                        cache: 'no-store'
                    }
                );

                if (response.status === 404) {
                    if (!cancelled) {
                        setItems([]);
                    }

                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data?.error ||
                        '자료를 불러오지 못했습니다.'
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
                        '자료를 불러오지 못했습니다.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [slug, apiPath]);

    if (loading) {
        return (
            <section className="content-card">
                <p className="eyebrow">{eyebrow}</p>
                <h2>{title}</h2>
                <p className="muted">
                    자료를 불러오는 중이에요...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="content-card">
                <p className="eyebrow">{eyebrow}</p>
                <h2>{title}</h2>
                <p style={{ color: '#bd3d3d' }}>
                    {error}
                </p>
            </section>
        );
    }

    if (items.length === 0) {
        return (
            <section className="content-card">
                <p className="eyebrow">{eyebrow}</p>
                <h2>{title}</h2>
                <p className="muted">
                    {emptyMessage || '등록된 자료가 없습니다.'}
                </p>
            </section>
        );
    }

    return (
        <section className="content-card">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>

            {description && (
                <p
                    className="muted"
                    style={{ marginBottom: 16 }}
                >
                    {description}
                </p>
            )}

            <div
                style={{
                    display: 'grid',
                    gap: 18
                }}
            >
                {items.map((item, index) => {
                    const preview = resourceFileUrl({
                        apiPath,
                        slug,
                        index,
                        download: false
                    });

                    const download = resourceFileUrl({
                        apiPath,
                        slug,
                        index,
                        download: true
                    });

                    return (
                        <div
                            key={`${slug}-${apiPath}-${index}`}
                        >
                            <img
                                src={preview}
                                alt={`${title} ${index + 1}`}
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
                                            ? '⬇ 다운로드'
                                            : `⬇ ${index + 1}페이지 다운로드`
                                    }
                                    fallbackFilename={
                                        `${title || 'Dear-Sunshine'}-${index + 1}`
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
