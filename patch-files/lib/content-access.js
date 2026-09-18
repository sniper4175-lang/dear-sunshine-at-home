/*
 * Dear Sunshine at Home
 *
 * 콘텐츠 접근 규칙
 * 1) Home Package에서 이미 열린 곡이면 접근 허용
 * 2) Song Club 이용권이 있으면 기존 수강 프로그램 권한으로 접근 허용
 *
 * Home Package는 userPrograms 전체가 아니라
 * membership.home_package_unlocked_song_ids에 들어 있는 곡만 열립니다.
 */
export function canAccessSong(
    song,
    membership,
    userPrograms = []
) {
    if (!song || !membership) {
        return false;
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
     * Home Package만 있는 계정은 프로그램 전체가 아니라
     * 위에서 확인한 개별 공개곡만 접근할 수 있습니다.
     */
    if (
        membership.product_type === 'home_package' ||
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
