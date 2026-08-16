'use client';

import {
    useState
} from 'react';


export default function DownloadButton({
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


    async function downloadSong() {

        if (loading) {
            return;
        }


        setLoading(true);
        setError('');


        try {

            const response =
                await fetch(
                    `/api/download-url?slug=${encodeURIComponent(slug)}`,
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
                    '음원을 다운로드하지 못했습니다.'
                );

            }


            if (!data.url) {

                throw new Error(
                    '다운로드 주소가 없습니다.'
                );

            }


            /*
             * Supabase 다운로드용
             * signed URL로 이동
             */
            window.location.href =
                data.url;


        } catch (error) {

            console.error(
                'download error:',
                error
            );


            setError(
                error.message ||
                '음원을 다운로드하지 못했습니다.'
            );


        } finally {

            setLoading(false);

        }

    }


    return (

        <div>

            <button
                type="button"
                className="secondary-button"
                onClick={downloadSong}
                disabled={loading}
            >

                {
                    loading
                        ? '다운로드 준비 중...'
                        : '⬇️ 음원 다운로드'
                }

            </button>


            {error && (

                <p
                    style={{
                        marginTop: 10,
                        marginBottom: 0,
                        color: '#bd3d3d',
                        fontSize: 13
                    }}
                >
                    {error}
                </p>

            )}

        </div>

    );
}