import './globals.css';
import BottomNav from '../components/BottomNav';

export const metadata = {
  title: 'Dear Sunshine at Home',
  description: '디어 선샤인 영어노래 홈 멤버십',
  manifest: '/manifest.webmanifest'
};

export default function RootLayout({ children }) {
  return <html lang="ko"><body><main className="app-shell">{children}</main><BottomNav /></body></html>;
}
