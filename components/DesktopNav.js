'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function isActive(pathname, key) {
  if (key === 'home') {
    return pathname === '/' || pathname === '/home-package';
  }

  if (key === 'library') {
    return (
      pathname === '/library' ||
      pathname.startsWith('/song/') ||
      pathname.startsWith('/home-package/song/')
    );
  }

  if (key === 'membership') {
    return pathname === '/membership' || pathname.startsWith('/membership/');
  }

  if (key === 'my') {
    return pathname === '/my' || pathname.startsWith('/my/');
  }

  return false;
}

export default function DesktopNav() {
  const pathname = usePathname() || '/';

  const items = [
    { href: '/', label: '홈', key: 'home' },
    { href: '/library', label: '노래', key: 'library' },
    { href: '/membership', label: 'Song Club', key: 'membership' },
    { href: '/my', label: 'MY', key: 'my' },
  ];

  return (
    <nav className="ds-desktop-nav" aria-label="메인 메뉴">
      {items.map((item) => {
        const active = isActive(pathname, item.key);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
