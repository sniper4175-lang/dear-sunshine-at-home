import Link from "next/link";

const EFFECTIVE_DATE = "2026-09-06";

function Section({ title, children }) {
  return (
    <section className="content-card">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="section top-section">
      <p className="eyebrow">TERMS</p>
      <h1>이용약관</h1>

      <p className="page-copy">
        본 약관은 Dear Sunshine Monthly Song Club의 회원가입 및 콘텐츠
        이용에 관한 기본 조건을 정합니다.
      </p>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          background: "#fff1e8",
          marginBottom: 18,
          lineHeight: 1.7,
        }}
      >
        <strong>정식 결제 오픈 전 필수 입력</strong>
        <br />
        상호, 대표자, 사업자등록번호, 통신판매업 신고번호, 사업장 주소,
        고객센터 연락처를 실제 사업자 정보로 교체해야 합니다.
      </div>

      <Section title="제1조 목적">
        <p>
          본 약관은 Dear Sunshine(이하 “회사”)이 제공하는 Dear Sunshine
          Monthly Song Club(이하 “서비스”) 이용과 관련하여 회사와 회원의
          권리·의무 및 책임사항을 정하는 것을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 서비스의 내용">
        <p>
          서비스는 Dear Sunshine 수업과 연계한 영어 노래 스트리밍,
          가사, Play Ideas, Printable Materials 등의 디지털콘텐츠를
          제공합니다. 구체적인 콘텐츠의 종류와 수량은 운영 과정에서
          변경될 수 있습니다.
        </p>
      </Section>

      <Section title="제3조 회원가입 및 계정">
        <p>
          회원은 정확한 이메일 정보를 사용하여 계정을 생성해야 하며,
          자신의 계정정보와 로그인 수단을 안전하게 관리해야 합니다.
          서비스는 Dear Sunshine의 정규 수강생을 대상으로 운영될 수 있으며,
          수강 여부 확인이 필요한 경우 별도의 확인 절차를 둘 수 있습니다.
        </p>
      </Section>

      <Section title="제4조 콘텐츠 이용권">
        <p>
          회원에게 제공되는 콘텐츠는 개인적·가정 내 학습 목적으로 이용할 수
          있는 제한적 이용권입니다. 회사의 사전 허락 없이 콘텐츠를 복제,
          재배포, 판매, 공개 게시, 공유계정 형태로 제공하거나 제3자에게
          전송해서는 안 됩니다.
        </p>
        <p>
          MP3 원본 다운로드는 서비스가 별도로 제공한다고 명시한 경우를
          제외하고 제공하지 않습니다.
        </p>
      </Section>

      <Section title="제5조 유료 구독 및 결제">
        <p>
          유료 구독의 가격, 무료체험, 결제주기, 자동갱신 및 해지 조건은
          <Link href="/subscription-policy"> 정기결제·해지 안내</Link>에
          따릅니다. 결제수단 등록 및 결제 승인은 회사가 계약한
          결제대행사를 통해 처리합니다.
        </p>
      </Section>

      <Section title="제6조 청약철회·환불">
        <p>
          회원의 청약철회 및 환불 권리는 전자상거래 등에서의 소비자보호에
          관한 법률 등 관계 법령에 따릅니다. 디지털콘텐츠의 제공이 이미
          개시된 경우 법령이 정한 요건에 따라 청약철회가 제한될 수 있으나,
          법령상 인정되는 소비자 권리를 본 약관으로 배제하지 않습니다.
        </p>
      </Section>

      <Section title="제7조 서비스 변경 및 중단">
        <p>
          시스템 점검, 보안, 장애, 제휴사 또는 인프라 사정 등 합리적인
          사유가 있는 경우 서비스의 일부가 일시적으로 제한될 수 있습니다.
          회원에게 중대한 영향을 미치는 변경은 가능한 범위에서 사전에
          알립니다.
        </p>
      </Section>

      <Section title="제8조 회원 탈퇴 및 계약 해지">
        <p>
          회원은 서비스 내 제공되는 전자적 방법을 통해 회원탈퇴 또는
          정기구독 해지를 신청할 수 있습니다. 정기구독 해지의 효과는
          정기결제·해지 안내에 따릅니다.
        </p>
      </Section>

      <Section title="제9조 회사의 책임">
        <p>
          회사는 관계 법령을 준수하고 개인정보 및 결제 관련 정보를
          합리적인 보안조치를 통해 보호합니다. 다만 회사의 고의 또는
          과실 없이 발생한 불가항력적 사유 등에 대해서는 관계 법령이
          허용하는 범위에서 책임이 제한될 수 있습니다.
        </p>
      </Section>

      <Section title="제10조 사업자 정보">
        <p>
          상호: [사업자 상호 입력]
          <br />
          대표자: [대표자 입력]
          <br />
          사업자등록번호: [사업자등록번호 입력]
          <br />
          통신판매업 신고번호: [신고번호 입력]
          <br />
          사업장 주소: [주소 입력]
          <br />
          고객문의: [이메일/전화 입력]
        </p>
      </Section>

      <Section title="제11조 준거법 및 분쟁해결">
        <p>
          본 약관은 대한민국 법령에 따릅니다. 서비스 이용과 관련한 분쟁은
          당사자 간 원만한 해결을 우선하며, 해결되지 않는 경우 관계 법령이
          정한 절차에 따릅니다.
        </p>
        <p>시행일: {EFFECTIVE_DATE}</p>
      </Section>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/">홈으로 돌아가기</Link>
      </p>
    </main>
  );
}
