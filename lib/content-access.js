/*
 * Dear Sunshine Monthly Song Club
 *
 * 최종 콘텐츠 접근 규칙
 * 1) 유효한 Song Club membership
 * 2) ds_user_program_access에 song.program 권한 존재
 *
 * basic/premium, premium_only, 최근 3개월 제한은
 * 콘텐츠 접근권한 판단에 사용하지 않습니다.
 */
export function canAccessSong(
    song,
    membership,
    userPrograms = []
) {

    if (
        !song ||
        !membership
    ) {
        return false;
    }


    if (
        !song.program ||
        !Array.isArray(
            userPrograms
        )
    ) {
        return false;
    }


    return userPrograms.includes(
        song.program
    );
}
