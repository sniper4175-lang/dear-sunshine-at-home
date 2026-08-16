'use client';

import {
    useState
} from 'react';


export default function PrintableButton({
    slug
}) {

    const [
        loading,
        setLoading
    ] =
        useState(false);


    const [
        error,
        setError
    ] =
        useState('');


    async function openPrintable() {

        if (loading) {
            return;
        }


        setLoading(
            true
        );

        setError(
            ''
        );


        try {

            const response =
                await fetch(
                    `/api/printable-url?slug=${encodeURIComponent(
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
                    '활동지를 열지 못했습니다.'
                );

            }


            if (!data.url) {

                throw new Error(
                    '활동지 주소가 없습니다.'
                );

            }


            window.open(
                data.url,
                '_blank',
                'noopener,noreferrer'
            );


        } catch (e) {

            console.error(e);

            setError(
                e.message ||
                '활동지를 열지 못했습니다.'
            );


        } finally {

            setLoading(
                false
            );

        }

    }


    return (

        <div>

            <button
                type="button"
                className="secondary-button"
                onClick={
                    openPrintable
                }
                disabled={
                    loading
                }
            >
                {
                    loading
                        ? '활동지 불러오는 중...'
                        : '📄 활동지 열기'
                }
            </button>


            {error && (

                <p
                    style={{
                        marginTop:
                            10,

                        color:
                            '#bd3d3d',

                        fontSize:
                            13
                    }}
                >
                    {error}
                </p>

            )}

        </div>

    );
}