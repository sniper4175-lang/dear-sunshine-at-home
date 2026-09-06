'use client';

import {
    useEffect,
    useState
} from 'react';


export default function LyricsSheet({
    slug,
    title
}) {

    const [
        items,
        setItems
    ] =
        useState([]);


    const [
        loading,
        setLoading
    ] =
        useState(true);


    const [
        error,
        setError
    ] =
        useState('');


    const [
        missing,
        setMissing
    ] =
        useState(false);


    useEffect(
        () => {

            let cancelled =
                false;


            async function loadLyrics() {

                try {

                    setLoading(
                        true
                    );

                    setError(
                        ''
                    );

                    setMissing(
                        false
                    );


                    const response =
                        await fetch(
                            `/api/lyrics-url?slug=${encodeURIComponent(
                                slug
                            )}`,
                            {
                                cache:
                                    'no-store'
                            }
                        );


                    const data =
                        await response.json();


                    /*
                     * 파일이 없는 곡은 에러 카드도 띄우지 않고
                     * 가사지 영역 자체를 숨김.
                     */
                    if (
                        response.status ===
                        404
                    ) {

                        if (!cancelled) {

                            setMissing(
                                true
                            );

                            setItems(
                                []
                            );

                        }


                        return;

                    }


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            '가사지를 불러오지 못했습니다.'
                        );

                    }


                    if (!cancelled) {

                        const nextItems =
                            Array.isArray(
                                data.items
                            )
                                ? data.items
                                : data.url
                                    ? [
                                        {
                                            name:
                                                `${title} 가사지`,
                                            url:
                                                data.url
                                        }
                                    ]
                                    : [];


                        setItems(
                            nextItems
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

                        setLoading(
                            false
                        );

                    }

                }

            }


            loadLyrics();


            return () => {

                cancelled =
                    true;

            };

        },
        [
            slug,
            title
        ]
    );


    if (
        !loading &&
        missing
    ) {
        return null;
    }


    if (loading) {

        return (

            <section className="content-card">

                <p className="eyebrow">
                    LYRIC SHEET
                </p>

                <h2>
                    가사지
                </h2>

                <p className="muted">
                    가사지를 불러오는 중이에요...
                </p>

            </section>

        );

    }


    if (error) {

        return (

            <section className="content-card">

                <p className="eyebrow">
                    LYRIC SHEET
                </p>

                <h2>
                    가사지
                </h2>

                <p
                    style={{
                        color:
                            '#bd3d3d'
                    }}
                >
                    {error}
                </p>

            </section>

        );

    }


    if (
        items.length === 0
    ) {
        return null;
    }


    return (

        <section className="content-card">

            <p className="eyebrow">
                LYRIC SHEET
            </p>

            <h2>
                가사지
            </h2>


            <p
                className="muted"
                style={{
                    marginBottom:
                        16
                }}
            >
                노래를 들으며 가사를 함께 확인해보세요.
            </p>


            <div
                style={{
                    display:
                        'grid',

                    gap:
                        18
                }}
            >

                {items.map(
                    (
                        item,
                        index
                    ) => (

                        <div
                            key={
                                item.path ||
                                item.url ||
                                `${slug}-${index}`
                            }
                        >

                            <a
                                href={
                                    item.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                            >

                                <img
                                    src={
                                        item.url
                                    }
                                    alt={
                                        `${title} 가사지 ${index + 1}`
                                    }
                                    style={{
                                        display:
                                            'block',

                                        width:
                                            '100%',

                                        height:
                                            'auto',

                                        borderRadius:
                                            16,

                                        border:
                                            '1px solid #eee3d5'
                                    }}
                                />

                            </a>


                            {items.length > 1 && (

                                <div
                                    style={{
                                        marginTop:
                                            8,

                                        color:
                                            '#8d8175',

                                        fontSize:
                                            12,

                                        textAlign:
                                            'center'
                                    }}
                                >
                                    {index + 1} / {items.length}
                                </div>

                            )}

                        </div>

                    )
                )}

            </div>


            <div
                style={{
                    marginTop:
                        16,

                    display:
                        'flex',

                    gap:
                        10,

                    flexWrap:
                        'wrap'
                }}
            >

                {items.map(
                    (
                        item,
                        index
                    ) => (

                        <a
                            key={
                                `open-${item.path || item.url || index}`
                            }
                            className="secondary-button"
                            href={
                                item.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            🔍 {
                                items.length === 1
                                    ? '가사지 크게 보기'
                                    : `${index + 1}페이지 크게 보기`
                            }
                        </a>

                    )
                )}

            </div>

        </section>

    );
}
