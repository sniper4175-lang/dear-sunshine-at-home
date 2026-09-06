'use client';

import {
    useEffect,
    useState
} from 'react';


export default function ResourceGallery({
    slug,
    apiPath,
    eyebrow,
    title,
    description,
    emptyMessage
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


    useEffect(
        () => {

            let cancelled =
                false;


            async function load() {

                try {

                    setLoading(
                        true
                    );

                    setError(
                        ''
                    );


                    const response =
                        await fetch(
                            `${apiPath}?slug=${encodeURIComponent(
                                slug
                            )}`,
                            {
                                cache:
                                    'no-store'
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            '자료를 불러오지 못했습니다.'
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
                                                title,
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
                            '자료를 불러오지 못했습니다.'
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


            load();


            return () => {

                cancelled =
                    true;

            };

        },
        [
            slug,
            apiPath,
            title
        ]
    );


    if (loading) {

        return (

            <section className="content-card">

                <p className="eyebrow">
                    {eyebrow}
                </p>

                <h2>
                    {title}
                </h2>

                <p className="muted">
                    자료를 불러오는 중이에요...
                </p>

            </section>

        );

    }


    if (error) {

        return (

            <section className="content-card">

                <p className="eyebrow">
                    {eyebrow}
                </p>

                <h2>
                    {title}
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

        return (

            <section className="content-card">

                <p className="eyebrow">
                    {eyebrow}
                </p>

                <h2>
                    {title}
                </h2>

                <p className="muted">
                    {
                        emptyMessage ||
                        '등록된 자료가 없습니다.'
                    }
                </p>

            </section>

        );

    }


    return (

        <section className="content-card">

            <p className="eyebrow">
                {eyebrow}
            </p>

            <h2>
                {title}
            </h2>


            {description && (

                <p
                    className="muted"
                    style={{
                        marginBottom:
                            16
                    }}
                >
                    {description}
                </p>

            )}


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
                                        `${title} ${index + 1}`
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
                                    ? '크게 보기'
                                    : `${index + 1}페이지 크게 보기`
                            }
                        </a>

                    )
                )}

            </div>

        </section>

    );
}
