'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/*
 * 많은 곡 카드가 한 화면에 있을 때 Next의 자동 prefetch가 모든 상세 RSC를
 * 한꺼번에 요청하지 않도록 막고, 사용자가 실제로 누르려는 링크만 미리 준비합니다.
 */
export default function IntentLink({
    href,
    children,
    onMouseEnter,
    onFocus,
    onTouchStart,
    ...props
}) {
    const router = useRouter();
    const warmed = useRef(false);

    function warmRoute() {
        if (warmed.current || !href) {
            return;
        }

        warmed.current = true;
        router.prefetch(String(href));
    }

    return (
        <Link
            {...props}
            href={href}
            prefetch={false}
            onMouseEnter={(event) => {
                warmRoute();
                onMouseEnter?.(event);
            }}
            onFocus={(event) => {
                warmRoute();
                onFocus?.(event);
            }}
            onTouchStart={(event) => {
                warmRoute();
                onTouchStart?.(event);
            }}
        >
            {children}
        </Link>
    );
}
