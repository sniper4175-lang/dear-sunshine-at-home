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

export default function PrivacyPage() {
  return (
    <main className="section top-section">
      <p className="eyebrow">PRIVACY</p>
      <h1>개인정보처리방침</h1>

      <p className="page-copy">
        Dear Sunshine Monthly Song Club(이하 “서비스”)은 이용자의 개인정보를
        필요한 범위에서 최소한으로 처리하고 안전하게 보호하기 위해 노력합니다.
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
        <strong>정식 결제 오픈 전 필수 확인</strong>
        <br />
        아래의 사업자 정보와 개인정보 보호책임자 연락처는 실제 정보로
        확정한 뒤 공개해야 합니다.
      </div>

      <Section title="1. 처리하는 개인정보와 이용 목적">
        <p>
          <strong>회원가입 및 로그인</strong>
          <br />
          처리 항목: 이메일 주소, 회원 식별자(user_id)
          <br />
          이용 목적: 회원 식별, 로그인, 계정 관리, 서비스 제공
        </p>

        <p>
          비밀번호는 Supabase Auth 등 인증 제공자가 인증을 위해 처리하며,
          Dear Sunshine이 평문 비밀번호를 별도 데이터베이스에 저장하지 않습니다.
        </p>

        <p>
          <strong>Song Club 구독 및 정기결제</strong>
          <br />
          처리 항목: 회원 식별자, 구독 상태, 무료체험 시작·종료일, 결제주기,
          다음 결제일, 결제대행사, 고객 식별키(customerKey), 결제수단 표시정보,
          결제·취소·환불 내역
          <br />
          이용 목적: 무료체험 및 정기구독 운영, 결제 승인, 결제 실패 처리,
          구독 해지 및 환불 처리, 거래기록 보존
        </p>

        <p>
          카드번호, CVC, 카드 비밀번호 등 원본 카드정보는 서비스 서버에 직접
          저장하지 않으며 결제대행사의 결제 화면에서 처리합니다.
        </p>

        <p>
          <strong>서비스 이용 과정에서 자동 생성될 수 있는 정보</strong>
          <br />
          접속기록, IP 주소, 브라우저·기기 정보, 오류·보안 로그 등이 서비스
          안정성 및 보안 확보를 위해 처리될 수 있습니다.
        </p>
      </Section>

      <Section title="2. 개인정보의 처리 근거">
        <p>
          서비스 제공에 필요한 정보는 회원과의 계약 체결·이행 또는 이용자의
          동의 등 개인정보 보호법이 정한 적법한 근거에 따라 처리합니다.
          동의를 받는 항목은 목적, 항목, 보유기간 및 동의 거부에 따른 영향을
          구분하여 안내합니다.
        </p>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용기간">
        <p>
          회원정보는 원칙적으로 회원탈퇴 또는 처리 목적 달성 시 지체 없이
          파기합니다. 다만 관계 법령에 따라 보존할 필요가 있는 정보는 해당
          기간 동안 별도로 보관합니다.
        </p>

        <ul>
          <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
          <li>대금결제 및 재화·서비스 공급에 관한 기록: 5년</li>
          <li>표시·광고에 관한 기록: 6개월</li>
        </ul>

        <p>
          구독 해지 후 사용하지 않는 빌링키는 결제대행사의 삭제 기능을 이용해
          불필요하게 보유하지 않도록 관리합니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 처리위탁 및 외부 서비스">
        <p>
          서비스 운영을 위해 아래와 같은 외부 서비스를 사용할 수 있습니다.
          실제 위탁 범위와 계약 내용이 확정되면 정식 서비스 오픈 전에
          최신 정보로 업데이트합니다.
        </p>

        <ul>
          <li>Supabase: 회원 인증, 데이터베이스, Private Storage</li>
          <li>Vercel: 웹서비스 호스팅 및 운영 인프라</li>
          <li>토스페이먼츠 등 계약 PG사: 결제수단 등록, 정기결제, 취소·환불</li>
        </ul>
      </Section>

      <Section title="5. 개인정보의 파기">
        <p>
          보유기간이 경과하거나 처리 목적이 달성된 개인정보는 복구 또는
          재생이 어렵도록 안전한 방법으로 파기합니다. 법령상 보존 의무가 있는
          정보는 다른 정보와 분리해 해당 보존기간 동안 관리합니다.
        </p>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>
          이용자는 자신의 개인정보에 대해 열람, 정정·삭제, 처리정지,
          동의 철회 및 회원탈퇴 등을 요청할 수 있습니다. 전자적으로 가입한
          서비스의 탈퇴·동의 철회·계약 해지도 전자적인 방법으로 할 수 있도록
          제공합니다.
        </p>
      </Section>

      <Section title="7. 안전성 확보조치">
        <ul>
          <li>Supabase RLS를 이용한 회원별 데이터 접근 제한</li>
          <li>회원 전용 음원·자료의 Private Storage 보관</li>
          <li>로그인 및 유효 멤버십 확인 후 짧은 signed URL 발급</li>
          <li>서버 비밀키와 브라우저 공개키 분리</li>
          <li>결제·빌링정보 서버 전용 테이블 분리 및 접근 제한</li>
          <li>불필요한 원본 결제정보 미수집</li>
        </ul>
      </Section>

      <Section title="8. 개인정보 보호책임자 및 문의">
        <p>
          개인정보 보호책임자: [이름 입력]
          <br />
          이메일: [개인정보 문의 이메일 입력]
          <br />
          전화번호: [문의 연락처 입력]
        </p>
      </Section>

      <Section title="9. 방침의 변경">
        <p>
          본 방침이 변경되는 경우 서비스 화면을 통해 시행일 전에 안내합니다.
          중요한 변경이 있는 경우 관계 법령에서 정한 방법에 따라 별도로
          알리거나 필요한 동의를 받습니다.
        </p>
        <p>시행일: {EFFECTIVE_DATE}</p>
      </Section>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/">홈으로 돌아가기</Link>
      </p>
    </main>
  );
}
