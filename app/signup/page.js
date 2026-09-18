'use client';
import { useState } from 'react';
export default function SignupPage() {
    const [
        email,
        setEmail
    ] =
        useState('');

    /* DS_STUDENT_NAME_SIGNUP_PATCH */
    const [studentName, setStudentName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    async function signup(e) {
        e.preventDefault();
        setError('');
        if (!studentName.trim()) {
            setError('학생 이름을 입력해주세요.');
            return;
        }

        if (
            password.length < 8
        ) {
            setError('비밀번호는 8자 이상으로 입력해주세요.');
            return;
        }
        const supabase = createBrowserSupabase();
        await supabase.auth.signUp({ email: email.trim(), password, options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            student_name:
                                    studentName.trim(),

                                terms_version: '2026-09-06',
            privacy_version: '2026-09-06'
          }
        }});
    }
    return <form>
                <label>
                    학생 이름
                    <input
                        className="normal"
                        type="text"
                        value={studentName}
                        onChange={e =>
                            setStudentName(e.target.value)
                        }
                        required
                        maxLength={30}
                        autoComplete="name"
                        placeholder="아이 이름을 입력해주세요."
                        style={{
                            width: '100%',
                            marginTop: 7
                        }}
                    />
                </label>

                <label>
                    이메일
                    <input
                        className="normal"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="example@email.com"
                        style={{ width: '100%', marginTop: 7 }}
                    />
                </label>
                <div>항목: 이메일, 학생 이름, 회원 식별자</div>
    </form>;
}
