import Link from 'next/link';


export default function SiteFooter() {

    return (

        <footer
            style={{
                marginTop: 50,
                padding: '28px 18px 100px',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                background: '#fffaf4'
            }}
        >

            <div
                style={{
                    maxWidth: 760,
                    margin: '0 auto'
                }}
            >

                <nav
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px 14px',
                        marginBottom: 18,
                        fontSize: 13
                    }}
                >

                    <Link href="/privacy">
                        개인정보처리방침
                    </Link>


                    <Link href="/terms">
                        이용약관
                    </Link>


                    <Link href="/subscription-policy">
                        이용권·환불 안내
                    </Link>

                </nav>


                <strong
                    style={{
                        display: 'block',
                        marginBottom: 10,
                        fontSize: 14
                    }}
                >
                    Dear Sunshine at Home
                </strong>


                <div
                    style={{
                        fontSize: 12,
                        lineHeight: 1.8,
                        color: '#75675c'
                    }}
                >

                    상호: 디어 선샤인 영어 발달놀이 & 북클럽
                    <br />

                    대표자: 경서연
                    {' · '}
                    사업자등록번호: 219-14-14366
                    <br />

                    주소: 서울특별시 마포구 신촌로 230,
                    3층 302호 디어 선샤인 영어 발달놀이 & 북클럽
                    (아현동, 리즈건물)
                    <br />

                    고객문의: 010-8247-6447
                    {' · '}
                    이메일: syeonjamie@gmail.com

                </div>


                <div
                    style={{
                        marginTop: 16,
                        fontSize: 11,
                        color: '#a09489'
                    }}
                >
                    © Dear Sunshine. All rights reserved.
                </div>

            </div>

        </footer>

    );

}
