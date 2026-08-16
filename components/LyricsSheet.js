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
        url,
        setUrl
    ] =
        useState('');


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


                    const response =
                        await fetch(
                            `/api/lyrics-url?slug=${encodeURIComponent(
                                slug
                            )}`
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            '가사지를 불러오지 못했습니다.'
                        );

                    }


                    if (!cancelled) {

                        setUrl(
                            data.url
                        );

                    }


                } catch (e) {

                    if (!cancelled) {

                        setError(
                            e.message
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
            slug
        ]
    );


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


            <a
                href={
                    url
                }
                target="_blank"
                rel="noopener noreferrer"
            >

                <img
                    src={
                        url
                    }
                    alt={
                        `${title} 가사지`
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


            <div
                style={{
                    marginTop:
                        16
                }}
            >

                <a
                    className="secondary-button"
                    href={
                        url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🔍 가사지 크게 보기
                </a>

            </div>

        </section>

    );
}