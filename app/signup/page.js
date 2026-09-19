'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }

    return createClient(supabaseUrl, supabaseKey);
}

export default function SignupPage() {
    const [studentName, setStudentName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function signup(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        const cleanStudentName = studentName.trim();
        const cleanEmail = email.trim();

        if (!cleanStudentName) {
            setError('학생 이름을 입력해주세요.');
            return;
        }

        if (!cleanEmail) {
            setError('이메일을 입력해주세요.');
            return;
        }

        if (password.length < 8) {
            setError('비밀번호는 8자 이상으로 입력해주세요.');
            return;
        }

        if (password !== passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (!termsAgreed) {
            setError('이용약관에 동의해주세요.');
            return;
        }

        if (!privacyAgreed) {
            setError('개인정보 수집·이용에 동의해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            const supabase = getSupabase();
            const { error: signupError } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`,
                    data: {
                        student_name: cleanStudentName,
                        terms_version: '2026-09-06',
                        privacy_version: '2026-09-06'
                    }
                }
            });

            if (signupError) {
                setError(signupError.message || '회원가입 중 오류가 발생했습니다.');
                return;
            }

            setSuccess('회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.');
        } catch (err) {
            setError(err?.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    }

    const inputStyle = {
        width: '100%',
        boxSizing: 'border-box',
        height: 42,
        marginTop: 7,
        padding: '0 12px',
        border: '1px solid #9a8e83',
        borderRadius: 0,
        background: '#fff',
        fontSize: 15,
        color: '#2d251f'
    };

    const labelStyle = {
        display: 'block',
        marginTop: 18,
        fontSize: 15,
        color: '#2f241d'
    };

    return (
        <main
            style={{
                minHeight: '100vh',
                background: '#fffaf2',
                color: '#2b211b',
                padding: '34px 18px 50px'
            }}
        >
            <div style={{ width: '100%', maxWidth: 540, margin: '0 auto' }}>
                <section style={{ textAlign: 'center', marginBottom: 34 }}>
                    <div style={{ fontSize: 48, lineHeight: 1 }}>☀️</div>
                    <div
                        style={{
                            marginTop: 16,
                            color: '#d77b00',
                            fontWeight: 800,
                            fontSize: 13,
                            letterSpacing: 1.4
                        }}
                    >
                        DEAR SUNSHINE MONTHLY SONG CLUB
                    </div>
                    <h1
                        style={{
                            margin: '23px 0 0',
                            fontSize: 31,
                            lineHeight: 1.2,
                            fontWeight: 800
                        }}
                    >
                        회원가입
                    </h1>
                    <p
                        style={{
                            margin: '25px auto 0',
                            maxWidth: 390,
                            color: '#a97860',
                            fontSize: 15,
                            lineHeight: 1.65
                        }}
                    >
                        Dear Sunshine 영어노래를 집에서도 이어서 만나보세요.
                    </p>
                </section>

                <form onSubmit={signup}>
                    <label style={labelStyle}>
                        학생 이름
                        <input
                            type="text"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            required
                            maxLength={30}
                            autoComplete="name"
                            placeholder="아이 이름을 입력해주세요."
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        이메일
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="example@email.com"
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        비밀번호
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="8자 이상 입력해주세요."
                            style={inputStyle}
                        />
                    </label>

                    <label style={labelStyle}>
                        비밀번호 확인
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="비밀번호를 한 번 더 입력해주세요."
                            style={inputStyle}
                        />
                    </label>

                    <div
                        style={{
                            marginTop: 22,
                            padding: '18px 18px 17px',
                            background: '#fff7e9',
                            borderRadius: 17
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 11,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: 1.5
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={termsAgreed}
                                onChange={(e) => setTermsAgreed(e.target.checked)}
                                style={{ marginTop: 4 }}
                            />
                            <span>
                                [필수] 이용약관 동의
                                <br />
                                <a
                                    href="/terms"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: 4,
                                        color: '#4b3528',
                                        fontWeight: 400,
                                        textDecoration: 'underline'
                                    }}
                                >
                                    이용약관 보기
                                </a>
                            </span>
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 11,
                                marginTop: 18,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: 1.55
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={privacyAgreed}
                                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                                style={{ marginTop: 4 }}
                            />
                            <span>
                                [필수] 개인정보 수집·이용 동의
                                <span
                                    style={{
                                        display: 'block',
                                        marginTop: 6,
                                        color: '#9b7560',
                                        fontWeight: 400,
                                        fontSize: 12,
                                        lineHeight: 1.55
                                    }}
                                >
                                    목적: 회원가입·로그인·서비스 제공
                                    <br />
                                    항목: 이메일, 학생 이름, 회원 식별자
                                    <br />
                                    보유: 회원탈퇴 시까지 (법령상 보존 의무가 있는 경우 제외)
                                    <br />
                                    동의를 거부할 수 있으나, 필수정보이므로 회원가입이 제한됩니다.
                                </span>
                                <a
                                    href="/privacy"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: 7,
                                        color: '#4b3528',
                                        fontWeight: 400,
                                        textDecoration: 'underline'
                                    }}
                                >
                                    개인정보처리방침 보기
                                </a>
                            </span>
                        </label>
                    </div>

                    {error ? (
                        <div
                            role="alert"
                            style={{
                                marginTop: 15,
                                color: '#b64335',
                                fontSize: 13,
                                lineHeight: 1.5
                            }}
                        >
                            {error}
                        </div>
                    ) : null}

                    {success ? (
                        <div
                            style={{
                                marginTop: 15,
                                color: '#39764b',
                                fontSize: 13,
                                lineHeight: 1.5
                            }}
                        >
                            {success}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            height: 48,
                            marginTop: 17,
                            border: 0,
                            borderRadius: 14,
                            background: submitting ? '#e5bd6b' : '#ffb93f',
                            color: '#2b211b',
                            fontSize: 15,
                            fontWeight: 800,
                            cursor: submitting ? 'default' : 'pointer'
                        }}
                    >
                        {submitting ? '가입 중...' : '회원가입'}
                    </button>
                </form>

                <p
                    style={{
                        margin: '23px 0 0',
                        textAlign: 'center',
                        color: '#9a7561',
                        fontSize: 14
                    }}
                >
                    이미 계정이 있으신가요?{' '}
                    <a href="/login" style={{ color: '#3c2e25' }}>
                        로그인
                    </a>
                </p>

                <footer
                    style={{
                        marginTop: 34,
                        paddingTop: 25,
                        borderTop: '1px solid #e7ddd1',
                        color: '#8f6f5d',
                        fontSize: 11,
                        lineHeight: 1.75
                    }}
                >
                    <div style={{ marginBottom: 15, fontSize: 12 }}>
                        <a href="/privacy" style={{ color: '#4b3528', marginRight: 16 }}>
                            개인정보처리방침
                        </a>
                        <a href="/terms" style={{ color: '#4b3528', marginRight: 16 }}>
                            이용약관
                        </a>
                        <a href="/refund" style={{ color: '#4b3528' }}>
                            이용권·환불 안내
                        </a>
                    </div>

                    <div style={{ color: '#5d4436', fontWeight: 700, fontSize: 12, marginBottom: 5 }}>
                        Dear Sunshine at Home
                    </div>
                    <div>제공 서비스: Dear Sunshine Monthly Song Club · Home Package</div>
                    <div>Home Package 이용권: 8회(10주) · 12회(15주) · 20회(25주)</div>
                    <div>상호: 디어 선샤인 영어 발달놀이 &amp; 북클럽</div>
                    <div>대표자: 경서연 · 사업자등록번호: 219-14-14366</div>
                    <div>주소: 서울특별시 마포구 신촌로 230, 3층 302호 디어 선샤인 영어 발달놀이 &amp; 북클럽 (아현동, 리즈건물)</div>
                    <div>고객문의: 010-8247-6447 · 이메일: syeonjamie@gmail.com</div>
                    <div style={{ marginTop: 16 }}>© Dear Sunshine. All rights reserved.</div>
                </footer>
            </div>
        </main>
    );
}
