/*
 * Dear Sunshine Song Club 공개일 기준 날짜
 *
 * Vercel 서버는 UTC로 동작할 수 있으므로
 * 공개일 판단은 항상 한국 시간(Asia/Seoul) 기준으로 합니다.
 */
export function todayKST() {
    const parts =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
        ).formatToParts(new Date());

    const year =
        parts.find(
            part => part.type === 'year'
        )?.value;

    const month =
        parts.find(
            part => part.type === 'month'
        )?.value;

    const day =
        parts.find(
            part => part.type === 'day'
        )?.value;

    return `${year}-${month}-${day}`;
}
