"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/", "⌂", "홈"],
  ["/library", "♫", "노래"],
  ["/my", "♡", "MY"],
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map(([href, icon, label]) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={active ? "active" : ""}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </Link>
        );
      })}
    </nav>
  );
}