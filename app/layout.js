import "./globals.css";
import BottomNav from "../components/BottomNav";

export const metadata = {
  title: "Dear Sunshine Monthly Song Club",

  description:
    "디어 선샤인의 영어노래와 놀이를 집에서도 자연스럽게 이어가요.",

  manifest: "/manifest.webmanifest",

  applicationName: "Dear Sunshine Monthly Song Club",

  icons: {
    icon: "/Dear_Sunshine_logo.png",
    apple: "/Dear_Sunshine_logo.png",
  },

  appleWebApp: {
    capable: true,
    title: "Sunshine Monthly Song Club",
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
        <main className="app-shell">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}