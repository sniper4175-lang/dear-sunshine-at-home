"use client";

import { useRouter } from "next/navigation";

export default function SongCard({
  song,
  accessible,
  loggedIn,
  membership,
}) {
  const router = useRouter();

  function openSong() {
    /*
     * 비로그인
     */
    if (!loggedIn) {
      router.push(
        `/login?next=${encodeURIComponent(
          `/song/${song.slug}`
        )}`
      );

      return;
    }

    /*
     * 로그인했지만 멤버십 없음
     */
    if (!membership) {
      router.push("/membership");

      return;
    }

    /*
     * 접근 가능한 콘텐츠
     *
     * Premium 전체 콘텐츠
     * Basic 최근 3개월 콘텐츠 등
     */
    if (accessible) {
      router.push(
        `/song/${song.slug}`
      );

      return;
    }

    /*
     * 로그인 + 멤버십은 있지만
     * 현재 요금제로 접근 불가능
     */
    router.push("/membership");
  }

  return (
    <button
      type="button"
      onClick={openSong}
      className="song-card"
      style={{
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
        opacity: accessible ? 1 : 0.72,
      }}
    >
      <div className="song-cover">
        <span>
          {song.emoji || "🎵"}
        </span>

        {song.popular && (
          <em>
            인기
          </em>
        )}

        {!accessible && (
          <b className="lock">
            🔒
          </b>
        )}
      </div>

      <div className="song-meta">
        <strong>
          {song.title}
        </strong>

        <span>
          {song.program}

          {song.category
            ? ` · ${song.category}`
            : ""}
        </span>

        {!accessible && (
          <span
            style={{
              marginTop: 5,
              fontWeight: 800,
              color: "#b7771f",
            }}
          >
            {!loggedIn
              ? "로그인 후 이용"
              : !membership
                ? "멤버십 필요"
                : song.premiumOnly
                  ? "Premium 전용"
                  : "Premium에서 전체 이용"}
          </span>
        )}
      </div>
    </button>
  );
}