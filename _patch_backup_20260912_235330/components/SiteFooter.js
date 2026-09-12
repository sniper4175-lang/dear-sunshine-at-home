import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      style={{
        padding: "28px 20px 110px",
        textAlign: "center",
        color: "#8d8175",
        fontSize: 12,
        lineHeight: 1.8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "8px 14px",
          marginBottom: 12,
        }}
      >
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/subscription-policy">정기결제·해지 안내</Link>
      </div>

      <div>Dear Sunshine Monthly Song Club</div>
      <div>
        사업자명 · 대표자 · 사업자등록번호 · 통신판매업 신고번호 · 고객문의 연락처는
        정식 결제 오픈 전에 실제 정보로 입력해주세요.
      </div>
    </footer>
  );
}
