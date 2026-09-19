export const metadata = {
    title: '이용권·환불 안내 | Dear Sunshine at Home'
};

const cardStyle = {
    marginTop: 16,
    padding: '18px 20px',
    border: '1px solid #efd7b8',
    borderRadius: 16,
    background: '#fffdf9'
};

const h2Style = {
    margin: '0 0 10px',
    fontSize: 18,
    color: '#2b211b'
};

const pStyle = {
    margin: '6px 0',
    fontSize: 14,
    lineHeight: 1.75,
    color: '#705646'
};

export default function RefundPage() {
    return (
        <main style={{ minHeight: '100vh', background: '#fffaf2', padding: '34px 18px 60px' }}>
            <article style={{ width: '100%', maxWidth: 760, margin: '0 auto', color: '#2b211b' }}>
                <a href="/" style={{ color: '#8a664f', fontSize: 13, textDecoration: 'none' }}>
                    ← Dear Sunshine at Home
                </a>

                <h1 style={{ margin: '24px 0 8px', fontSize: 30 }}>이용권·환불 안내</h1>
                <p style={{ ...pStyle, marginTop: 0 }}>
                    Dear Sunshine at Home의 Song Club 및 Home Package 이용권 운영 기준입니다.
                </p>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Monthly Song Club</h2>
                    <p style={pStyle}>센터에서 결제를 확인한 뒤 회원 계정의 이용기간을 활성화합니다.</p>
                    <p style={pStyle}>현재 운영 상품: 1개월 · 3개월 · 6개월 · 12개월</p>
                    <p style={pStyle}>앱 안에서 별도의 자동결제가 발생하지 않으며, 연장 또는 재활성화는 센터 확인 후 처리됩니다.</p>
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Home Package</h2>
                    <p style={pStyle}><strong>8회 Home Package</strong> · 기본 이용기간 10주</p>
                    <p style={pStyle}><strong>12회 Home Package</strong> · 기본 이용기간 15주</p>
                    <p style={pStyle}><strong>20회 Home Package</strong> · 기본 이용기간 25주</p>
                    <p style={pStyle}>시작일을 기준으로 상품별 기본 종료일이 계산되며, 센터와 협의된 경우 관리자에서 종료일을 조정할 수 있습니다.</p>
                    <p style={pStyle}>상품별로 기본곡, 주차별 신곡, 추가곡 또는 보너스곡이 제공될 수 있으며 공개된 콘텐츠 구성은 회원별 상품에 따라 다릅니다.</p>
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>변경·중지·환불 문의</h2>
                    <p style={pStyle}>이용권 변경, 일시중지, 이용 종료 또는 환불이 필요한 경우 센터로 문의해주세요.</p>
                    <p style={pStyle}>실제 환불 가능 여부와 금액은 결제 시 안내된 조건, 콘텐츠 이용 및 공개 상태, 이용기간 경과 여부와 관련 법령을 함께 확인하여 안내합니다.</p>
                    <p style={pStyle}>회원별 이용기간 변경 또는 예외 처리가 확정된 경우 관리자에 등록된 시작일·종료일을 기준으로 서비스 이용 권한이 적용됩니다.</p>
                </section>

                <section style={{ marginTop: 28 }}>
                    <h2 style={h2Style}>문의</h2>
                    <p style={pStyle}>디어 선샤인 영어 발달놀이 &amp; 북클럽</p>
                    <p style={pStyle}>전화: 010-8247-6447</p>
                    <p style={pStyle}>이메일: syeonjamie@gmail.com</p>
                </section>

                <footer style={{ marginTop: 42, paddingTop: 22, borderTop: '1px solid #eadfd3', ...pStyle, fontSize: 12 }}>
                    Dear Sunshine at Home
                </footer>
            </article>
        </main>
    );
}
