'use client';

import { useState } from 'react';

function decodeFilenameFromDisposition(disposition) {
    if (!disposition) {
        return '';
    }

    const utf8Match =
        disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const normalMatch =
        disposition.match(/filename="?([^";]+)"?/i);

    return normalMatch?.[1] || '';
}

export default function SecureDownloadButton({
    url,
    label = '⬇ 다운로드',
    fallbackFilename = 'dear-sunshine-resource'
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function download() {
        if (loading || !url) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(url, {
                cache: 'no-store'
            });

            if (!response.ok) {
                let message = '파일을 다운로드하지 못했습니다.';

                try {
                    const data = await response.json();
                    message = data?.error || message;
                } catch {
                    // JSON이 아닌 오류 응답은 기본 문구 사용
                }

                throw new Error(message);
            }

            const blob = await response.blob();

            const filename =
                decodeFilenameFromDisposition(
                    response.headers.get('content-disposition')
                ) || fallbackFilename;

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = blobUrl;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (e) {
            console.error(e);

            setError(
                e?.message ||
                '파일을 다운로드하지 못했습니다.'
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
                onClick={download}
                disabled={loading || !url}
            >
                {loading ? '다운로드 중...' : label}
            </button>

            {error && (
                <p
                    style={{
                        marginTop: 10,
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
