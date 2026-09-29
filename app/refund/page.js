export const metadata = {
    title: '이용권·환불 안내 | Dear Sunshine Home'
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
                    ← Dear Sunshine Home
                </a>

                <h1 style={{ margin: '24px 0 8px', fontSize: 30 }}>이용권·환불 안내</h1>
                <p style={{ ...pStyle, marginTop: 0 }}>
                    Dear Sunshine Home의 Monthly Song Club 및 Home Package 이용권 운영 기준입니다.
                </p>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Monthly Song Club</h2>
                    <p style={pStyle}>센터에서 결제를 확인한 뒤 회원 계정의 이용기간을 활성화합니다.</p>
                    <p style={pStyle}>현재 운영 상품: 1개월 · 3개월 · 6개월 · 12개월</p>
                    <p style={pStyle}>앱 안에서 별도의 자동결제가 발생하지 않으며, 연장 또는 재활성화는 센터 확인 후 처리됩니다.</p>
                    <p style={pStyle}>이용 시작 전 취소 또는 이용 중 변경·환불이 필요한 경우 센터로 문의해주세요. 실제 환불 가능 여부와 금액은 결제 당시 안내된 조건과 이용기간 경과 여부를 확인하여 안내합니다.</p>
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Home Package 이용권</h2>
                    <p style={pStyle}><strong>8회 Home Package</strong> · 기본 이용기간 10주</p>
                    <p style={pStyle}><strong>12회 Home Package</strong> · 기본 이용기간 15주</p>
                    <p style={pStyle}><strong>20회 Home Package</strong> · 기본 이용기간 25주</p>
                    <p style={pStyle}>시작일 당일 기본곡과 1주차 콘텐츠가 공개되며, 이후 주차별 콘텐츠는 7일 단위로 순차 공개됩니다.</p>
                    <p style={pStyle}>상품에 따라 추가 기본곡, 주차별 추가곡 또는 보너스곡이 함께 제공될 수 있습니다.</p>
                    <p style={pStyle}>센터와 협의된 경우 관리자에 등록된 종료일을 조정할 수 있으며, 실제 이용 권한은 등록된 시작일·종료일을 기준으로 적용됩니다.</p>
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>Home Package 변경·환불 기준</h2>
                    <p style={pStyle}>Home Package는 음원, 가사지, 활동자료, 놀이 아이디어 등이 순차 제공되는 디지털 콘텐츠 이용권입니다.</p>
                    <p style={pStyle}><strong>이용 시작 전</strong>: 콘텐츠 이용이 시작되지 않은 상태에서 취소를 요청하는 경우 결제 내역을 확인하여 환불을 안내합니다.</p>
                    <p style={pStyle}><strong>이용 시작 후</strong>: 이미 공개·제공된 콘텐츠와 이용기간 경과분이 있는 경우, 해당 이용분을 반영하여 환불 가능 금액을 안내할 수 있습니다.</p>
                    <p style={pStyle}><strong>이용기간 종료 후</strong>: 이용기간이 종료된 이용권은 환불이 제한될 수 있습니다.</p>
                    <p style={pStyle}>센터 사정으로 정상적인 콘텐츠 제공이 불가능한 경우에는 미제공 부분을 확인하여 기간 연장, 대체 제공 또는 환불 등으로 별도 안내합니다.</p>
                    <p style={pStyle}>구체적인 환불 가능 여부와 금액은 결제 당시 안내된 조건, 실제 콘텐츠 공개·이용 상태 및 관련 법령을 함께 확인하여 최종 안내합니다.</p>
                </section>

                <section style={cardStyle}>
                    <h2 style={h2Style}>일시중지·이용기간 변경</h2>
                    <p style={pStyle}>Home Package의 일시중지 또는 이용기간 변경은 자동으로 적용되지 않으며, 필요한 경우 센터로 문의해주세요.</p>
                    <p style={pStyle}>센터와 협의하여 변경이 확정되면 관리자에 등록된 시작일·종료일을 수정하고, 수정된 기간을 기준으로 이용 권한이 적용됩니다.</p>
                </section>

                <section style={{ marginTop: 28 }}>
                    <h2 style={h2Style}>문의</h2>
                    <p style={pStyle}>디어 선샤인 영어 발달놀이 &amp; 북클럽</p>
                    <p style={pStyle}>전화: 010-8247-6447</p>
                    <p style={pStyle}>이메일: syeonjamie@gmail.com</p>
                </section>

                <footer style={{ marginTop: 42, paddingTop: 22, borderTop: '1px solid #eadfd3', ...pStyle, fontSize: 12 }}>
                    Dear Sunshine Home · Monthly Song Club · Home Package
                </footer>
            </article>
        </main>
    );
}
