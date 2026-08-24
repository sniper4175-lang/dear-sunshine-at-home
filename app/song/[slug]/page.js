import PrintableButton from "../../../components/PrintableButton";
/*
import DownloadButton from "../../../components/DownloadButton";
*/
import { notFound } from "next/navigation";

import Link from "next/link";

import { getSongBySlug } from "../../../lib/content";

import { getCurrentMembership } from "../../../lib/membership";

import { canAccessSong } from "../../../lib/content-access";

import AudioPlayer from "../../../components/AudioPlayer";

import LyricsSheet from "../../../components/LyricsSheet";

export const dynamic = "force-dynamic";

export default async function SongPage({ params }) {
  const { slug } = await params;

  /*
   * 곡 정보 조회
   */
  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  /*
   * 현재 로그인 / 멤버십 확인
   */
  const { user, membership } = await getCurrentMembership();

  const loggedIn = Boolean(user);

  /*
   * 실제 접근 가능 여부
   */
  const accessible = canAccessSong(song, membership);

  /*
   * 잠긴 이유
   */
  let lockedTitle = "";

  let lockedDescription = "";

  let lockedButton = "";

  let lockedHref = "";

  if (!loggedIn) {
    lockedTitle = "로그인 후 들을 수 있어요";

    lockedDescription =
      "DEAR SUNSHINE MONTHLY SONG CLUB에 로그인하면 이용 가능한 음원을 확인할 수 있어요.";

    lockedButton = "로그인하기";

    lockedHref = "/login";
  } else if (!membership) {
    lockedTitle = "멤버십이 필요해요";

    lockedDescription =
      "이 노래를 들으려면 Basic 또는 Premium 멤버십이 필요해요.";

    lockedButton = "멤버십 보기";

    lockedHref = "/membership";
  } else if (membership.plan === "basic") {
    if (song.premiumOnly) {
      lockedTitle = "Premium 전용 노래예요";

      lockedDescription =
        "이 콘텐츠는 Premium 멤버십에서 이용할 수 있어요.";
    } else {
      lockedTitle = "Premium에서 전체 음원을 만나보세요";

      lockedDescription =
        "Basic 멤버십은 최근 3개월 콘텐츠를 이용할 수 있어요. Premium에서는 이전에 공개된 노래까지 모두 들을 수 있어요.";
    }

    lockedButton = "Premium 알아보기";

    lockedHref = "/membership";
  }

  return (
    <section className="song-page">
      {/* 뒤로가기 */}

      <Link className="back-link" href="/library">
        ← 노래 목록
      </Link>

      {/* 대표 이미지 */}

      <div className="song-cover large">
        <span>{song.emoji || "🎵"}</span>
      </div>

      {/* 프로그램 */}

      {song.program && (
        <p className="eyebrow">{song.program}</p>
      )}

      {/* 카테고리 */}

      {song.category && (
        <p
          className="eyebrow"
          style={{
            marginTop: 4,
          }}
        >
          {song.category}
        </p>
      )}

      {/* 제목 */}

      <h1>{song.title}</h1>

      {/* 설명 */}

      {song.subtitle && (
        <p className="page-copy">{song.subtitle}</p>
      )}

      {/* =====================================
                접근 가능
            ====================================== */}

      {accessible ? (
        <>
          <AudioPlayer
            title={song.title}
            slug={song.slug}
          />

          {membership?.plan === "premium" && (
            <div
              style={{
                marginTop: 12,
                marginBottom: 20,
              }}
            >
             { /* 버튼 주석 처리 */}
             {/* <DownloadButton slug={song.slug} /> */}
              
            </div>
          )}

          {/* 활동지 */}

          {song.printablePath && (
            <section
              className="content-card"
              style={{
                marginTop: 20,
              }}
            >
              <p className="eyebrow">PRINTABLE</p>

              <h2>활동자료</h2>

              <p className="page-copy">
                노래를 들으며 집에서도 함께 영어놀이를
                이어가 보세요.
              </p>

              <PrintableButton slug={song.slug} />
            </section>
          )}

          {song.lyricsPath && (
            <LyricsSheet
              slug={song.slug}
              title={song.title}
            />
          )}

          {song.lyrics && song.lyrics.length > 0 && (
            <section className="content-card">
              <p className="eyebrow">LYRICS</p>

              <h2>가사</h2>

              <div className="lyrics">
                {song.lyrics.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </section>
          )}

          {song.activities &&
            song.activities.length > 0 && (
              <section className="content-card">
                <p className="eyebrow">Monthly Song Club</p>

                <h2>이 노래로 놀아요</h2>

                <div className="steps">
                  {song.activities.map(
                    (activity, index) => (
                      <div
                        className="step"
                        key={`${song.slug}-${index}`}
                      >
                        <span>{index + 1}</span>

                        <div>
                          <strong>{activity.title}</strong>

                          <p>{activity.description}</p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}
        </>
      ) : (
        /*
         * =====================================
         * 잠긴 콘텐츠 안내
         * =====================================
         */

        <section
          className="content-card"
          style={{
            marginTop: 20,

            textAlign: "center",

            padding: "34px 22px",
          }}
        >
          <div
            style={{
              width: 64,

              height: 64,

              margin: "0 auto 16px",

              borderRadius: "50%",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              background: "#fff1c9",

              fontSize: 28,
            }}
          >
            🔒
          </div>

          <p className="eyebrow">MEMBERSHIP</p>

          <h2>{lockedTitle}</h2>

          <p
            className="page-copy"
            style={{
              maxWidth: 440,

              margin: "0 auto 22px",
            }}
          >
            {lockedDescription}
          </p>

          <Link
            href={lockedHref}
            className="primary-button"
          >
            {lockedButton}
          </Link>
        </section>
      )}

      {/* Premium 표시 */}

      {song.premiumOnly && (
        <div
          style={{
            marginTop: 18,

            fontSize: 13,

            color: "#9b7c61",

            textAlign: "center",
          }}
        >
          🔒 Premium 전용 콘텐츠
        </div>
      )}
    </section>
  );
}
