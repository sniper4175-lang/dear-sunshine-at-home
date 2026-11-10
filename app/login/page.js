"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { createBrowserSupabase } from "../../lib/supabase-browser";

const EMAIL_REDIRECT_URL = "https://songclub.dearsunshine.co.kr/login";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  function getRedirectPath() {
    if (typeof window === "undefined") {
      return "/";
    }

    const params = new URLSearchParams(window.location.search);

    const next = params.get("next");

    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return next;
    }

    return "/";
  }

  async function login(e) {
    e.preventDefault();

    setLoading(true);

    setError("");
    setMessage("");

    try {
      const supabase = createBrowserSupabase();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),

        password,
      });

      if (error) {
        const normalizedMessage = String(error.message || "").toLowerCase();

        if (normalizedMessage.includes("email not confirmed")) {
          setError(
            "이메일 인증이 완료되지 않았어요. 아래 '인증메일 다시 보내기'를 눌러 인증을 완료해주세요."
          );
        } else {
          setError("이메일 또는 비밀번호를 확인해주세요.");
        }

        return;
      }

      /*
       * 로그인 성공 후
       * 원래 보던 페이지로 이동
       */
      router.replace(getRedirectPath());

      router.refresh();
    } catch (e) {
      console.error(e);

      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmationEmail() {
    const normalizedEmail = email.trim();

    setError("");
    setMessage("");

    if (!normalizedEmail) {
      setError("인증메일을 받을 이메일 주소를 먼저 입력해주세요.");
      return;
    }

    setResendLoading(true);

    try {
      const supabase = createBrowserSupabase();

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_URL,
        },
      });

      if (error) {
        console.error("Confirmation email resend error:", error);

        const normalizedMessage = String(error.message || "").toLowerCase();

        if (
          normalizedMessage.includes("rate limit") ||
          normalizedMessage.includes("too many")
        ) {
          setError(
            "인증메일을 너무 자주 요청했어요. 잠시 후 다시 시도해주세요."
          );
        } else if (
          normalizedMessage.includes("already confirmed") ||
          normalizedMessage.includes("already been confirmed")
        ) {
          setMessage("이미 이메일 인증이 완료된 계정이에요. 바로 로그인해주세요.");
        } else {
          setError(
            "인증메일을 다시 보내지 못했어요. 이메일 주소를 확인한 뒤 다시 시도해주세요."
          );
        }

        return;
      }

      setMessage(
        "인증메일을 다시 보냈어요. 메일함을 확인한 뒤 '이메일 인증 완료하기'를 눌러주세요. 아이폰에서는 가능하면 Safari로 열어주세요."
      );
    } catch (e) {
      console.error(e);

      setError("인증메일 재전송 중 오류가 발생했습니다.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,

        margin: "0 auto",

        padding: "70px 22px",
      }}
    >
      <div
        style={{
          textAlign: "center",

          marginBottom: 34,
        }}
      >
        <div
          style={{
            fontSize: 46,
          }}
        >
          ☀️
        </div>

        <p className="eyebrow">DEAR SUNSHINE HOME</p>

        <h1>로그인</h1>

        <p className="page-copy">
          Dear Sunshine 영어노래를 집에서도 만나보세요.
        </p>
      </div>

      <form
        onSubmit={login}
        style={{
          display: "grid",

          gap: 14,
        }}
      >
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              display: "block",

              width: "100%",

              marginTop: 7,

              padding: 14,

              borderRadius: 14,

              border: "1px solid #eee3d5",
            }}
          />
        </label>

        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              display: "block",

              width: "100%",

              marginTop: 7,

              padding: 14,

              borderRadius: 14,

              border: "1px solid #eee3d5",
            }}
          />
        </label>

        <div
          style={{
            textAlign: "right",

            marginTop: -4,
          }}
        >
          <a
            href="/forgot-password"
            style={{
              fontSize: 13,
            }}
          >
            비밀번호를 잊으셨나요?
          </a>
        </div>

        {error && (
          <p
            style={{
              margin: 0,

              color: "#bd3d3d",

              fontSize: 13,

              lineHeight: 1.55,
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            style={{
              margin: 0,

              color: "#5f7d4e",

              fontSize: 13,

              lineHeight: 1.55,
            }}
          >
            {message}
          </p>
        )}

        <button
          className="primary-button wide"
          type="submit"
          disabled={loading || resendLoading}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div
        style={{
          marginTop: 18,
          padding: "16px 14px",
          borderRadius: 16,
          background: "#fff8ea",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: "#75685e",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          이메일 인증이 안 되셨나요?
          <br />
          위에 이메일 주소를 입력한 뒤 다시 받아보세요.
        </p>

        <button
          type="button"
          onClick={resendConfirmationEmail}
          disabled={loading || resendLoading}
          style={{
            border: "1px solid #e8d8c4",
            background: "#ffffff",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: loading || resendLoading ? "default" : "pointer",
          }}
        >
          {resendLoading ? "인증메일 보내는 중..." : "인증메일 다시 보내기"}
        </button>
      </div>

      <div
        style={{
          textAlign: "center",

          marginTop: 24,
        }}
      >
        <span
          style={{
            color: "#8d8175",
          }}
        >
          처음 이용하시나요?{" "}
        </span>

        <a href="/signup">회원가입</a>
      </div>
    </main>
  );
}
