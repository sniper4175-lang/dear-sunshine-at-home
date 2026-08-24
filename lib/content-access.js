/*
 * Dear Sunshine Monthly Song Club
 *
 * 단일 멤버십 구조:
 * 유효한 membership이 있으면
 * 공개된 Song Club 콘텐츠에 접근 가능.
 *
 * 기존 DB의 plan = basic / premium 값은
 * 호환을 위해 남겨두되 접근권한 판단에는 사용하지 않음.
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


    return true;
}
