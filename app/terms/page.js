export const metadata = {
    title: '이용약관 | Dear Sunshine Home'
};

const sectionStyle = {
    marginTop: 28
};

const h2Style = {
    margin: '0 0 10px',
    fontSize: 18,
    lineHeight: 1.4,
    color: '#2b211b'
};

const pStyle = {
    margin: '7px 0',
    fontSize: 14,
    lineHeight: 1.75,
    color: '#6f5546'
};

export default function TermsPage() {
    return (
        <main style={{ minHeight: '100vh', background: '#fffaf2', padding: '34px 18px 60px' }}>
            <article style={{ width: '100%', maxWidth: 760, margin: '0 auto', color: '#2b211b' }}>
                <a href="/" style={{ color: '#8a664f', fontSize: 13, textDecoration: 'none' }}>
                    ← Dear Sunshine Home
                </a>

                <h1 style={{ margin: '24px 0 8px', fontSize: 30 }}>이용약관</h1>
                <p style={{ ...pStyle, marginTop: 0 }}>Dear Sunshine Home 서비스 이용에 관한 기본 사항입니다.</p>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>1. 서비스</h2>
                    <p style={pStyle}>
                        Dear Sunshine Home은 디어 선샤인의 영어 음원과 가사지, 활동자료, 놀이 아이디어 등을 온라인으로 제공하는 디지털 서비스입니다.
                    </p>
                    <p style={pStyle}>
                        서비스 상품은 <strong>Monthly Song Club</strong>과 <strong>Home Package</strong>로 구분되며, 회원에게 활성화된 상품과 클래스에 따라 이용 가능한 콘텐츠가 달라질 수 있습니다.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>2. Monthly Song Club</h2>
                    <p style={pStyle}>Song Club은 센터에서 결제를 확인한 뒤 회원 계정에 이용기간을 활성화하는 방식으로 운영됩니다.</p>
                    <p style={pStyle}>이용권은 1개월, 3개월, 6개월, 12개월 상품으로 운영될 수 있으며 실제 판매 상품과 금액은 센터가 안내한 최신 내용을 기준으로 합니다.</p>
                    <p style={pStyle}>회원은 활성화된 이용기간과 선택된 클래스 범위에서 공개된 Song Club 콘텐츠를 이용할 수 있습니다.</p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>3. Home Package</h2>
                    <p style={pStyle}>Home Package는 수강권과 연계하여 가정에서도 Dear Sunshine 콘텐츠를 이어서 이용할 수 있도록 제공되는 디지털 콘텐츠 이용권입니다.</p>
                    <p style={pStyle}><strong>8회 Home Package</strong>: 기본 이용기간 10주</p>
                    <p style={pStyle}><strong>12회 Home Package</strong>: 기본 이용기간 15주</p>
                    <p style={pStyle}><strong>20회 Home Package</strong>: 기본 이용기간 25주</p>
                    <p style={pStyle}>Home Package에서는 상품에 따라 기본곡과 주차별 공개곡, 추가곡 또는 보너스곡이 제공될 수 있습니다.</p>
                    <p style={pStyle}>콘텐츠 공개 구성과 공개 시점은 센터의 운영 계획에 따라 달라질 수 있으며, 회원별 시작일과 종료일은 관리자 화면에 등록된 정보를 기준으로 합니다.</p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>4. 계정 및 이용</h2>
                    <p style={pStyle}>회원은 본인의 계정을 타인에게 양도하거나 공유해서는 안 됩니다.</p>
                    <p style={pStyle}>서비스 내 음원, 이미지, 가사지, 활동자료 및 기타 콘텐츠는 개인적인 가정 학습 목적으로만 이용할 수 있습니다.</p>
                    <p style={pStyle}>허가 없는 복제, 재배포, 판매, 공개 업로드 또는 상업적 이용은 제한됩니다.</p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>5. 서비스 운영 및 변경</h2>
                    <p style={pStyle}>콘텐츠 구성, 공개 일정, 서비스 화면 및 일부 기능은 운영 또는 기술상의 필요에 따라 변경될 수 있습니다.</p>
                    <p style={pStyle}>중요한 변경이 있는 경우 서비스 화면 또는 별도 안내를 통해 공지합니다.</p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>6. 이용권·환불</h2>
                    <p style={pStyle}>결제, 이용기간 변경 및 환불에 관한 자세한 내용은 별도의 이용권·환불 안내를 따릅니다.</p>
                    <a href="/refund" style={{ color: '#8a5b26', fontSize: 14, textDecoration: 'underline' }}>
                        이용권·환불 안내 보기
                    </a>
                </section>

                <footer style={{ marginTop: 42, paddingTop: 22, borderTop: '1px solid #eadfd3', ...pStyle, fontSize: 12 }}>
                    Dear Sunshine Home · Monthly Song Club · Home Package
                </footer>
            </article>
        </main>
    );
}
