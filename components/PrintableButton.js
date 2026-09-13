'use client';

import SecureDownloadButton from './SecureDownloadButton';

export default function PrintableButton({ slug }) {
    const url =
        `/api/resource-file?source=${encodeURIComponent('/api/printable-url')}` +
        `&slug=${encodeURIComponent(slug)}` +
        '&index=0&download=1';

    return (
        <SecureDownloadButton
            url={url}
            label="⬇ 활동자료 다운로드"
            fallbackFilename="Dear-Sunshine-Printable"
        />
    );
}
