"use client";

import { useState } from "react";

import Link from "next/link";

import { createBrowserSupabase } from "../../lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  async function sendResetEmail(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const supabase = createBrowserSupabase();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );

      if (error) {
        console.error(error);

        setError(error.message || "비밀번호 재설정 메일을 보내지 못했습니다.");

        return;
      }

      setMessage(
        "비밀번호 재설정 메일을 보냈어요. 이메일에서 링크를 눌러주세요.",
      );
    } catch (e) {
      console.error(e);

      setError("비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: "60px 22px 100px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 48,
          }}
        >
          ☀️
        </div>

        <p className="eyebrow">DEAR SUNSHINE SONG CLUB</p>

        <h1>비밀번호 찾기</h1>

        <p className="page-copy">가입한 이메일 주소를 입력해주세요.</p>
      </div>

      <form
        onSubmit={sendResetEmail}
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label>
          이메일
          <input
            className="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@email.com"
            style={{
              width: "100%",
              marginTop: 7,
            }}
          />
        </label>

        {message && (
          <div
            style={{
              padding: 15,
              borderRadius: 14,
              background: "#fff8e8",
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <p
            style={{
              color: "#bd3d3d",
              fontSize: 13,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-button wide"
          disabled={loading}
        >
          {loading ? "메일 보내는 중..." : "재설정 메일 보내기"}
        </button>
      </form>

      <div
        style={{
          textAlign: "center",
          marginTop: 24,
        }}
      >
        <Link href="/login">← 로그인으로 돌아가기</Link>
      </div>
    </main>
  );
}
