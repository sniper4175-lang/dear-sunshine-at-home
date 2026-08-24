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

  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  const { user, membership } = await getCurrentMembership();

  const loggedIn = Boolean(user);

  const accessible = canAccessSong(song, membership);

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
    lockedTitle = "Song Club 멤버십이 필요해요";

    lockedDescription =
      "Dear Sunshine Monthly Song Club 회원은 수업에서 만난 노래와 자료를 집에서도 이용할 수 있어요.";

    lockedButton = "Song Club 보기";

    lockedHref = "/membership";
  } else {
    lockedTitle = "현재 이용할 수 없는 콘텐츠예요";

    lockedDescription =
      "멤버십 상태 또는 콘텐츠 공개 상태를 확인해주세요.";

    lockedButton = "멤버십 보기";

    lockedHref = "/membership";
  }

  return (
    <section className="song-page">
      <Link className="back-link" href="/library">
        ← 노래 목록
      </Link>

      <div className="song-cover large">
        <span>{song.emoji || "🎵"}</span>
      </div>

      {song.program && (
        <p className="eyebrow">{song.program}</p>
      )}

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

      <h1>{song.title}</h1>

      {song.subtitle && (
        <p className="page-copy">{song.subtitle}</p>
      )}

      {accessible ? (
        <>
          <AudioPlayer
            title={song.title}
            slug={song.slug}
          />

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
                <p className="eyebrow">
                  MONTHLY SONG CLUB
                </p>

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
    </section>
  );
}
