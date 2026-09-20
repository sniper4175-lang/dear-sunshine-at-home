import "./globals.css";
import "./mobile-redesign.css";
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
        <main className="app-shell">
          {children}
          <SiteFooter />
        </main>
        <BottomNav />
      </body>
    </html>
  );
}

