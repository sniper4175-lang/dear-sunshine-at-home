/*
 * 한국 기준 오늘 날짜
 */
function todayKST() {

    return new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone:
                'Asia/Seoul',

            year:
                'numeric',

            month:
                '2-digit',

            day:
                '2-digit'
        }
    ).format(
        new Date()
    );
}


/*
 * YYYY-MM-DD 날짜에서
 * n개월 전 날짜 계산
 */
function monthsAgo(
    dateString,
    months
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split('-')
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    date.setUTCMonth(
        date.getUTCMonth() -
        months
    );


    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


/*
 * Basic 이용 가능 여부
 *
 * Basic:
 * 최근 3개월 공개 콘텐츠
 *
 * Premium:
 * 전체 공개 콘텐츠
 */
export function canAccessSong(
    song,
    membership
) {

    if (
        !song ||
        !membership
    ) {
        return false;
    }


    /*
     * Premium은 전체 이용
     */
    if (
        membership.plan ===
        'premium'
    ) {
        return true;
    }


    /*
     * Basic이 아닌 경우 차단
     */
    if (
        membership.plan !==
        'basic'
    ) {
        return false;
    }


    /*
     * 관리자가 특별히
     * Premium 전용으로 지정한 콘텐츠는
     * Basic에서 이용 불가
     */
    if (
        song.premiumOnly
    ) {
        return false;
    }


    /*
     * 공개일이 없으면
     * Basic에서는 안전하게 차단
     */
    if (
        !song.releaseDate
    ) {
        return false;
    }


    const today =
        todayKST();


    const threshold =
        monthsAgo(
            today,
            3
        );


    /*
     * 최근 3개월 콘텐츠만 허용
     */
    return (
        song.releaseDate >=
            threshold &&
        song.releaseDate <=
            today
    );
}