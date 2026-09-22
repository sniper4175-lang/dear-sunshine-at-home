/*
 * Dear Sunshine Home
 *
 * 콘텐츠 접근 규칙
 * 1) 이메일 계정별로 직접 지급한 추가곡이면 접근 허용
 * 2) Home Package에서 이미 열린 곡이면 접근 허용
 * 3) Song Club 이용권이 있으면 기존 수강 프로그램 권한으로 접근 허용
 */
export function canAccessSong(
    song,
    membership,
    userPrograms = []
) {
    if (!song || !membership) {
        return false;
    }

    const accountBonusSongIds = Array.isArray(
        membership.account_bonus_song_ids
    )
        ? membership.account_bonus_song_ids
        : [];

    if (
        song.id &&
        accountBonusSongIds.includes(song.id)
    ) {
        return true;
    }

    const homePackageSongIds = Array.isArray(
        membership.home_package_unlocked_song_ids
    )
        ? membership.home_package_unlocked_song_ids
        : [];

    if (
        song.id &&
        homePackageSongIds.includes(song.id)
    ) {
        return true;
    }

    /*
     * Home Package만 있거나 계정별 추가곡만 있는 계정은
     * 프로그램 전체가 아니라 위에서 확인한 개별 곡만 접근합니다.
     */
    if (
        membership.product_type === 'home_package' ||
        membership.product_type === 'bonus_only' ||
        membership.song_club_active === false
    ) {
        return false;
    }

    if (
        !song.program ||
        !Array.isArray(userPrograms)
    ) {
        return false;
    }

    return userPrograms.includes(song.program);
}
