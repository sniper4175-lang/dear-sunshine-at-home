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

export default function SubscriptionPolicyPage() {
  return (
    <main className="section top-section">
      <p className="eyebrow">SUBSCRIPTION</p>
      <h1>정기결제·해지 안내</h1>

      <div
        className="content-card"
        style={{
          textAlign: "center",
          background: "#fff8ea",
        }}
      >
        <strong style={{ display: "block", fontSize: 20, marginBottom: 8 }}>
          첫 7일 무료
        </strong>
        <div>무료체험 종료 후 월 12,900원 자동결제</div>
      </div>

      <Section title="1. 무료체험과 첫 결제">
        <p>
          Song Club 구독을 시작할 때 결제수단을 등록합니다. 최초 7일 동안은
          이용료가 청구되지 않으며, 무료체험이 끝난 다음 날 월 12,900원이
          등록한 결제수단으로 자동 결제됩니다.
        </p>
        <p>
          구독 시작 화면에서 유료 전환일, 전환 후 가격, 결제방법 및
          해지방법을 확인하고 명시적으로 동의한 경우에만 무료체험을
          시작합니다.
        </p>
      </Section>

      <Section title="2. 자동갱신">
        <p>
          첫 결제 이후 회원이 해지하기 전까지 월 12,900원이 매월 자동
          결제됩니다. 실제 결제일은 최초 유료 결제일을 기준으로 운영하며,
          결제일 계산의 세부 기준은 PG 연동 구현 시 서비스 화면에 동일하게
          표시합니다.
        </p>
      </Section>

      <Section title="3. 무료체험 중 해지">
        <p>
          첫 유료 결제 전에 해지하면 월 12,900원은 청구되지 않습니다.
          무료체험 종료 시점까지 이용을 허용할지 즉시 종료할지는 실제
          해지 기능 구현 시 사용자에게 명확히 표시하며, 기본 설계는
          무료체험 종료 시점까지 이용 가능하도록 합니다.
        </p>
      </Section>

      <Section title="4. 유료 구독 해지">
        <p>
          회원은 마이페이지에서 전자적으로 구독을 해지할 수 있습니다.
          해지 신청이 완료되면 다음 결제일부터 자동결제가 중단됩니다.
          이미 결제된 이용기간은 원칙적으로 그 기간의 종료일까지 이용할 수
          있도록 설계합니다.
        </p>
        <p>
          사용하지 않는 빌링키는 더 이상 정기결제에 사용하지 않으며,
          필요한 경우 결제대행사의 빌링키 삭제 기능을 이용합니다.
        </p>
      </Section>

      <Section title="5. 결제 실패">
        <p>
          카드 재발급, 한도 초과, 잔액 부족, 유효기간 만료 등의 사유로
          결제가 실패할 수 있습니다. 결제가 실패하면 회원에게 결제수단
          변경 또는 재등록을 안내하고, 일정 기간 결제가 완료되지 않으면
          콘텐츠 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <Section title="6. 청약철회 및 환불">
        <p>
          전자상거래법에 따른 청약철회 및 환불 권리는 보장됩니다. 일반적으로
          계약내용에 관한 서면을 받은 날 또는 서비스 공급이 시작된 날을
          기준으로 법이 정한 청약철회 기간이 적용될 수 있습니다.
        </p>
        <p>
          디지털콘텐츠의 제공이 이미 시작된 경우 법령이 정한 요건에 따라
          청약철회가 제한될 수 있습니다. 다만 회사가 법에서 요구하는
          사전 표시·시험사용 제공 등의 조치를 하지 않은 경우 등에는
          제한이 적용되지 않을 수 있습니다.
        </p>
        <p>
          법령에 따라 환급 의무가 발생하는 경우 관계 법령이 정한 기간과
          절차에 따라 환급 또는 결제취소 조치를 진행합니다.
        </p>
      </Section>

      <Section title="7. 가격 인상 또는 무료→유료 전환">
        <p>
          정기결제 금액이 인상되거나 무료 서비스가 유료 정기결제로
          전환되는 경우, 관계 법령에서 요구하는 시점 안에 전환 일시,
          변경 전후 가격 및 결제방법에 대해 필요한 동의를 받고,
          취소·해지 조건과 방법 및 그 효과를 안내합니다.
        </p>
        <p>
          현재 7일 무료체험은 구독 시작 시점에 “7일 후 월 12,900원
          자동결제”에 별도 동의를 받은 경우에만 시작하도록 설계합니다.
        </p>
      </Section>

      <Section title="8. 결제수단">
        <p>
          정기결제는 계약한 PG사가 제공하는 결제수단 범위에서 운영합니다.
          토스페이먼츠를 사용하는 경우 자동결제는 별도 심사 및 계약이
          필요하며, 네이버페이·토스페이 자동결제 역시 별도 심사가 필요할
          수 있습니다.
        </p>
      </Section>

      <Section title="9. 문의">
        <p>
          결제·해지·환불 문의: [고객문의 이메일/전화 입력]
          <br />
          운영자: [사업자 상호 입력]
        </p>
        <p>시행일: {EFFECTIVE_DATE}</p>
      </Section>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/terms">이용약관</Link>
        {" · "}
        <Link href="/privacy">개인정보처리방침</Link>
      </p>
    </main>
  );
}
