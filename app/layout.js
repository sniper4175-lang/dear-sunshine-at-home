import "./globals.css";
import "./mobile-redesign.css";
import "./web-redesign.css";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import SiteFooter from "../components/SiteFooter";

export const metadata = {
  title: "Dear Sunshine Home",
  description:
    "디어 선샤인의 영어노래와 놀이를 집에서도 자연스럽게 이어가요.",
  manifest: "/manifest.webmanifest",
  applicationName: "Dear Sunshine Home",
  icons: {
    icon: "/Dear_Sunshine_logo.png",
    apple: "/Dear_Sunshine_logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "Dear Sunshine Home",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#fffaf2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="ds-desktop-header">
          <div className="ds-desktop-header-inner">
            <Link href="/" className="ds-desktop-brand" aria-label="Dear Sunshine Home">
              <span className="ds-desktop-brand-mark">☀️</span>
              <span className="ds-desktop-brand-copy">
                <strong>Dear Sunshine</strong>
                <small>Sing · Play · Grow</small>
              </span>
            </Link>

            <nav className="ds-desktop-nav" aria-label="메인 메뉴">
              <Link href="/">홈</Link>
              <Link href="/library">노래</Link>
              <Link href="/membership">Song Club</Link>
              <Link href="/my" className="ds-desktop-my">MY</Link>
            </nav>
          </div>
        </header>

        <main className="app-shell">
          {children}
          <SiteFooter />
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
