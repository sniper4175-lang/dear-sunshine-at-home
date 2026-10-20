'use client';

import {
    useEffect,
    useState
} from 'react';

import {
    useRouter
} from 'next/navigation';

import Link from 'next/link';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';


const ONE_SIGNAL_APP_ID =
    process.env
        .NEXT_PUBLIC_ONESIGNAL_APP_ID;


function isIosDevice() {

    if (
        typeof navigator ===
        'undefined'
    ) {
        return false;
    }


    return (
        /iPad|iPhone|iPod/.test(
            navigator.userAgent
        ) ||
        (
            navigator.platform ===
                'MacIntel' &&
            navigator.maxTouchPoints >
                1
        )
    );

}


function isStandaloneMode() {

    if (
        typeof window ===
        'undefined'
    ) {
        return false;
    }


    return (
        window.matchMedia?.(
            '(display-mode: standalone)'
        )?.matches ||
        window.navigator?.standalone ===
            true
    );

}


function loadOneSignal() {

    if (
        typeof window ===
        'undefined' ||
        !ONE_SIGNAL_APP_ID
    ) {
        return Promise.resolve(
            null
        );
    }


    if (
        window.__dearSunshineOneSignalPromise
    ) {
        return window
            .__dearSunshineOneSignalPromise;
    }


    window.OneSignalDeferred =
        window.OneSignalDeferred ||
        [];


    window.__dearSunshineOneSignalPromise =
        new Promise(
            (resolve, reject) => {

                window.OneSignalDeferred.push(
                    async OneSignal => {

                        try {

                            if (
                                !window
                                    .__dearSunshineOneSignalInitialized
                            ) {

                                await OneSignal.init({
                                    appId:
                                        ONE_SIGNAL_APP_ID,

                                    serviceWorkerPath:
                                        '/OneSignalSDKWorker.js',

                                    serviceWorkerParam: {
                                        scope:
                                            '/'
                                    },

                                    notifyButton: {
                                        enable:
                                            false
                                    }
                                });


                                window
                                    .__dearSunshineOneSignalInitialized =
                                    true;

                            }


                            resolve(
                                OneSignal
                            );

                        } catch (error) {

                            reject(
                                error
                            );

                        }

                    }
                );


                if (
                    !document.querySelector(
                        'script[data-dear-sunshine-onesignal]'
                    )
                ) {

                    const script =
                        document.createElement(
                            'script'
                        );


                    script.src =
                        'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

                    script.defer =
                        true;

                    script.dataset
                        .dearSunshineOnesignal =
                        'true';


                    script.onerror =
                        () => {

                            window
                                .__dearSunshineOneSignalPromise =
                                null;


                            reject(
                                new Error(
                                    'OneSignal SDK를 불러오지 못했습니다.'
                                )
                            );

                        };


                    document.head
                        .appendChild(
                            script
                        );

                }

            }
        );


    return window
        .__dearSunshineOneSignalPromise;

}


async function identifyOneSignalUser(
    OneSignal
) {

    const supabase =
        createBrowserSupabase();


    const {
        data: {
            user
        }
    } =
        await supabase.auth
            .getUser();


    if (
        user?.id
    ) {

        await OneSignal.login(
            user.id
        );

    }


    return user ||
        null;

}


function formatDate(
    value
) {

    if (!value) {
        return '-';
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '-';
    }


    return date
        .toLocaleDateString(
            'ko-KR',
            {
                timeZone:
                    'Asia/Seoul',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        );

}


function membershipStart(
    membership
) {

    return (
        membership?.current_period_start ||
        membership?.trial_starts_at ||
        membership?.starts_at ||
        null
    );

}


function membershipEnd(
    membership
) {

    return (
        membership?.current_period_end ||
        membership?.trial_ends_at ||
        membership?.ends_at ||
        null
    );

}


function MenuLink({
    href,
    icon,
    title,
    description
}) {

    return (

        <Link
            href={href}
            style={{
                display:
                    'grid',

                gridTemplateColumns:
                    '42px minmax(0,1fr) 24px',

                gap:
                    12,

                alignItems:
                    'center',

                padding:
                    '13px 0',

                borderBottom:
                    '1px solid #f1e8dd'
            }}
        >

            <span
                style={{
                    width:
                        42,

                    height:
                        42,

                    display:
                        'grid',

                    placeItems:
                        'center',

                    borderRadius:
                        13,

                    background:
                        '#fff6df',

                    fontSize:
                        21
                }}
            >
                {icon}
            </span>

            <span
                style={{
                    minWidth:
                        0
                }}
            >

                <strong
                    style={{
                        display:
                            'block',

                        fontSize:
                            14
                    }}
                >
                    {title}
                </strong>

                {description && (
                    <span
                        className="muted"
                        style={{
                            display:
                                'block',

                            marginTop:
                                3,

                            fontSize:
                                12,

                            lineHeight:
                                1.4
                        }}
                    >
                        {description}
                    </span>
                )}

            </span>

            <span
                className="muted"
                style={{
                    justifySelf:
                        'end',

                    fontSize:
                        22
                }}
            >
                ›
            </span>

        </Link>

    );

}


export default function MyPageClient({
    loggedIn,
    email,
    membership
}) {

    const router =
        useRouter();


    const [
        pushStatus,
        setPushStatus
    ] =
        useState(
            'loading'
        );


    const [
        pushBusy,
        setPushBusy
    ] =
        useState(
            false
        );


    useEffect(
        () => {

            if (
                !loggedIn
            ) {
                return;
            }


            let disposed =
                false;


            async function syncPushStatus() {

                if (
                    !ONE_SIGNAL_APP_ID
                ) {

                    if (!disposed) {
                        setPushStatus(
                            'unconfigured'
                        );
                    }

                    return;
                }


                if (
                    isIosDevice() &&
                    !isStandaloneMode()
                ) {

                    if (!disposed) {
                        setPushStatus(
                            'ios-install-required'
                        );
                    }

                    return;
                }


                try {

                    const OneSignal =
                        await loadOneSignal();


                    if (
                        !OneSignal
                    ) {

                        if (!disposed) {
                            setPushStatus(
                                'unconfigured'
                            );
                        }

                        return;
                    }


                    if (
                        !OneSignal.Notifications
                            .isPushSupported()
                    ) {

                        if (!disposed) {
                            setPushStatus(
                                'unsupported'
                            );
                        }

                        return;
                    }


                    await identifyOneSignalUser(
                        OneSignal
                    );


                    const permission =
                        Boolean(
                            OneSignal.Notifications
                                .permission
                        );

                    const optedIn =
                        Boolean(
                            OneSignal.User
                                ?.PushSubscription
                                ?.optedIn
                        );


                    if (!disposed) {

                        setPushStatus(
                            permission &&
                            optedIn
                                ? 'enabled'
                                : OneSignal.Notifications
                                    .permissionNative ===
                                    'denied'
                                    ? 'denied'
                                    : 'ready'
                        );

                    }


                    const permissionListener =
                        granted => {

                            if (!disposed) {

                                setPushStatus(
                                    granted
                                        ? 'enabled'
                                        : 'denied'
                                );

                            }

                        };


                    OneSignal.Notifications
                        .addEventListener(
                            'permissionChange',
                            permissionListener
                        );


                    return () => {

                        OneSignal.Notifications
                            .removeEventListener(
                                'permissionChange',
                                permissionListener
                            );

                    };

                } catch (error) {

                    console.error(
                        'OneSignal init error:',
                        error
                    );


                    if (!disposed) {
                        setPushStatus(
                            'error'
                        );
                    }

                }

            }


            let cleanup;


            syncPushStatus()
                .then(
                    result => {
                        cleanup =
                            result;
                    }
                );


            return () => {

                disposed =
                    true;


                if (
                    typeof cleanup ===
                    'function'
                ) {
                    cleanup();
                }

            };

        },
        [
            loggedIn
        ]
    );


    async function enablePushNotifications() {

        if (
            pushBusy
        ) {
            return;
        }


        if (
            isIosDevice() &&
            !isStandaloneMode()
        ) {

            alert(
                'iPhone에서는 Safari에서 홈 화면에 추가한 뒤, 설치된 Dear Sunshine Home을 열어서 알림을 켜주세요.'
            );

            setPushStatus(
                'ios-install-required'
            );

            return;
        }


        setPushBusy(
            true
        );


        try {

            const OneSignal =
                await loadOneSignal();


            if (
                !OneSignal
            ) {
                throw new Error(
                    '알림 설정이 아직 완료되지 않았습니다.'
                );
            }


            if (
                !OneSignal.Notifications
                    .isPushSupported()
            ) {

                setPushStatus(
                    'unsupported'
                );

                return;
            }


            await identifyOneSignalUser(
                OneSignal
            );


            const granted =
                await OneSignal.Notifications
                    .requestPermission();


            if (
                granted ||
                OneSignal.Notifications
                    .permission
            ) {

                await OneSignal.User
                    .PushSubscription
                    .optIn();


                setPushStatus(
                    'enabled'
                );

            } else {

                setPushStatus(
                    OneSignal.Notifications
                        .permissionNative ===
                        'denied'
                        ? 'denied'
                        : 'ready'
                );

            }

        } catch (error) {

            console.error(
                'Push opt-in error:',
                error
            );


            setPushStatus(
                'error'
            );


            alert(
                error?.message ||
                '알림 설정 중 오류가 발생했습니다.'
            );

        } finally {

            setPushBusy(
                false
            );

        }

    }


    async function logout() {

        try {

            if (
                ONE_SIGNAL_APP_ID
            ) {

                const OneSignal =
                    await loadOneSignal();


                if (
                    OneSignal
                ) {
                    await OneSignal.logout();
                }

            }

        } catch (error) {

            console.warn(
                'OneSignal logout skipped:',
                error
            );

        }


        const supabase =
            createBrowserSupabase();


        const {
            error
        } =
            await supabase
                .auth
                .signOut();


        if (error) {

            alert(
                '로그아웃 중 오류가 발생했습니다.'
            );

            return;

        }


        router.replace(
            '/login'
        );

        router.refresh();

    }


    if (!loggedIn) {

        return (

            <main
                style={{
                    maxWidth:
                        520,

                    margin:
                        '0 auto',

                    padding:
                        '50px 20px 110px'
                }}
            >

                <div
                    style={{
                        textAlign:
                            'center'
                    }}
                >

                    <div
                        style={{
                            fontSize:
                                50,

                            marginBottom:
                                12
                        }}
                    >
                        ☀️
                    </div>

                    <p className="eyebrow">
                        MY SUNSHINE
                    </p>

                    <h1>
                        MY
                    </h1>

                    <p className="page-copy">
                        로그인 후 이용권 상태와 계정 정보를 확인할 수 있어요.
                    </p>

                    <Link
                        href="/login"
                        className="primary-button"
                    >
                        로그인하기
                    </Link>

                </div>

            </main>

        );

    }


    const startsAt =
        membershipStart(
            membership
        );

    const endsAt =
        membershipEnd(
            membership
        );


    return (

        <main
            style={{
                maxWidth:
                    520,

                margin:
                    '0 auto',

                padding:
                    '40px 20px 110px'
            }}
        >

            <div
                style={{
                    textAlign:
                        'center',

                    marginBottom:
                        28
                }}
            >

                <div
                    style={{
                        fontSize:
                            48,

                        marginBottom:
                            8
                    }}
                >
                    ☀️
                </div>

                <p className="eyebrow">
                    MY SUNSHINE
                </p>

                <h1>
                    MY
                </h1>

            </div>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    ACCOUNT
                </p>

                <h2
                    style={{
                        marginBottom:
                            7,

                        overflowWrap:
                            'anywhere'
                    }}
                >
                    {email}
                </h2>

                <p
                    className="muted"
                    style={{
                        margin:
                            0,

                        fontSize:
                            13
                    }}
                >
                    {membership?.product_type === 'home_package'
                        ? 'Dear Sunshine Home Package 계정'
                        : membership?.product_type === 'combined'
                            ? 'Dear Sunshine Song Club + Home Package 계정'
                            : 'Dear Sunshine Song Club 계정'}
                </p>

            </section>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    MY PASS
                </p>

                {membership ? (

                    <>

                        <div
                            style={{
                                display:
                                    'flex',

                                justifyContent:
                                    'space-between',

                                alignItems:
                                    'center',

                                gap:
                                    12,

                                flexWrap:
                                    'wrap'
                            }}
                        >

                            <div>

                                <h2
                                    style={{
                                        margin:
                                            '0 0 6px'
                                    }}
                                >
                                    {membership?.product_type === 'home_package'
                                        ? '🏠 Home Package 이용 중'
                                        : membership?.product_type === 'combined'
                                            ? '☀️ Song Club + 🏠 Home Package 이용 중'
                                            : '☀️ Song Club 이용 중'}
                                </h2>

                                <p
                                    className="muted"
                                    style={{
                                        margin:
                                            0,

                                        fontSize:
                                            13
                                    }}
                                >
                                    현재 이용권이 활성화되어 있어요.
                                </p>

                            </div>

                            <span
                                style={{
                                    padding:
                                        '7px 12px',

                                    borderRadius:
                                        999,

                                    background:
                                        '#eef8ef',

                                    fontSize:
                                        13,

                                    fontWeight:
                                        800
                                }}
                            >
                                🟢 이용중
                            </span>

                        </div>


                        <div
                            style={{
                                marginTop:
                                    20,

                                paddingTop:
                                    16,

                                borderTop:
                                    '1px solid #eee3d5',

                                display:
                                    'grid',

                                gap:
                                    12
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        'flex',

                                    justifyContent:
                                        'space-between',

                                    gap:
                                        18
                                }}
                            >
                                <span className="muted">
                                    이용 시작일
                                </span>
                                <strong>
                                    {formatDate(startsAt)}
                                </strong>
                            </div>

                            <div
                                style={{
                                    display:
                                        'flex',

                                    justifyContent:
                                        'space-between',

                                    gap:
                                        18
                                }}
                            >
                                <span className="muted">
                                    이용 종료일
                                </span>
                                <strong>
                                    {formatDate(endsAt)}
                                </strong>
                            </div>

                        </div>

                        <Link
                            href={
                                membership?.product_type === 'home_package'
                                    ? '/home-package'
                                    : '/membership'
                            }
                            className="secondary-button wide"
                            style={{
                                marginTop:
                                    18
                            }}
                        >
                            {membership?.product_type === 'home_package'
                                ? 'Home Package 열기'
                                : '이용권 자세히 보기'}
                        </Link>

                        {membership?.product_type === 'combined' && (
                            <Link
                                href="/home-package"
                                className="secondary-button wide"
                                style={{ marginTop: 10 }}
                            >
                                🏠 Home Package 열기
                            </Link>
                        )}

                    </>

                ) : (

                    <div
                        style={{
                            textAlign:
                                'center'
                        }}
                    >

                        <div
                            style={{
                                fontSize:
                                    32,

                                marginBottom:
                                    8
                            }}
                        >
                            🔒
                        </div>

                        <h2>
                            이용 중인 이용권이 없어요
                        </h2>

                        <p className="page-copy">
                            Song Club 이용권 등록 후 음원과 플래시 카드를 이용할 수 있어요.
                        </p>

                        <Link
                            href="/membership"
                            className="primary-button"
                        >
                            이용권 보기
                        </Link>

                    </div>

                )}

            </section>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    NOTIFICATIONS
                </p>

                <h2>
                    신곡 알림 🔔
                </h2>

                <p className="page-copy">
                    매주 화요일 새로운 수업곡이 공개되면 알려드려요.
                </p>

                {pushStatus === 'enabled' ? (

                    <div
                        style={{
                            padding:
                                '12px 14px',

                            borderRadius:
                                14,

                            background:
                                '#eef8ef',

                            fontSize:
                                13,

                            fontWeight:
                                800
                        }}
                    >
                        🔔 신곡 알림을 받고 있어요.
                    </div>

                ) : (

                    <>

                        <button
                            type="button"
                            className="primary-button wide"
                            onClick={
                                enablePushNotifications
                            }
                            disabled={
                                pushBusy ||
                                pushStatus ===
                                    'loading' ||
                                pushStatus ===
                                    'unconfigured' ||
                                pushStatus ===
                                    'unsupported'
                            }
                        >
                            {pushBusy
                                ? '알림 설정 중...'
                                : pushStatus === 'loading'
                                    ? '알림 확인 중...'
                                    : '🔔 신곡 알림 받기'}
                        </button>

                        {pushStatus === 'ios-install-required' && (
                            <p
                                className="muted"
                                style={{
                                    margin:
                                        '10px 0 0',

                                    fontSize:
                                        12,

                                    lineHeight:
                                        1.6
                                }}
                            >
                                iPhone은 Safari에서 홈 화면에 추가한 뒤 설치된 Dear Sunshine Home에서 알림을 켜주세요.
                            </p>
                        )}

                        {pushStatus === 'denied' && (
                            <p
                                className="muted"
                                style={{
                                    margin:
                                        '10px 0 0',

                                    fontSize:
                                        12,

                                    lineHeight:
                                        1.6
                                }}
                            >
                                브라우저에서 알림이 차단되어 있어요. 사이트 설정에서 알림을 허용한 뒤 다시 눌러주세요.
                            </p>
                        )}

                        {pushStatus === 'unsupported' && (
                            <p
                                className="muted"
                                style={{
                                    margin:
                                        '10px 0 0',

                                    fontSize:
                                        12
                                }}
                            >
                                현재 브라우저에서는 웹 푸시 알림을 지원하지 않아요.
                            </p>
                        )}

                        {pushStatus === 'unconfigured' && (
                            <p
                                className="muted"
                                style={{
                                    margin:
                                        '10px 0 0',

                                    fontSize:
                                        12
                                }}
                            >
                                알림 서비스 설정을 준비 중이에요.
                            </p>
                        )}

                        {pushStatus === 'error' && (
                            <p
                                className="muted"
                                style={{
                                    margin:
                                        '10px 0 0',

                                    fontSize:
                                        12
                                }}
                            >
                                알림 설정을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
                            </p>
                        )}

                    </>

                )}

            </section>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    MENU
                </p>

                <h2
                    style={{
                        marginBottom:
                            6
                    }}
                >
                    이용 안내
                </h2>

                <MenuLink
                    href="/subscription-policy"
                    icon="🎟️"
                    title="이용권·환불 안내"
                    description="이용기간과 환불 기준을 확인해요."
                />

                <MenuLink
                    href="/terms"
                    icon="📄"
                    title="이용약관"
                    description="Dear Sunshine Home 서비스 이용약관이에요."
                />

                <MenuLink
                    href="/privacy"
                    icon="🔐"
                    title="개인정보처리방침"
                    description="개인정보 처리 기준을 확인해요."
                />

            </section>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    APP INSTALL
                </p>

                <h2>
                    홈 화면에 추가하기 📱
                </h2>

                <p className="page-copy">
                    Dear Sunshine Home을 홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요.
                </p>

                <details
                    style={{
                        borderTop:
                            '1px solid #eee3d5',

                        padding:
                            '14px 0'
                    }}
                >
                    <summary
                        style={{
                            cursor:
                                'pointer',

                            fontWeight:
                                800
                        }}
                    >
                        🍎 iPhone 설치 방법
                    </summary>

                    <p
                        className="muted"
                        style={{
                            margin:
                                '12px 0 0',

                            lineHeight:
                                1.8,

                            fontSize:
                                13
                        }}
                    >
                        Safari에서 Dear Sunshine Home을 연 뒤 공유 버튼을 누르고
                        ‘홈 화면에 추가’를 선택해 주세요.
                    </p>
                </details>

                <details
                    style={{
                        borderTop:
                            '1px solid #eee3d5',

                        padding:
                            '14px 0 2px'
                    }}
                >
                    <summary
                        style={{
                            cursor:
                                'pointer',

                            fontWeight:
                                800
                        }}
                    >
                        🤖 Android 설치 방법
                    </summary>

                    <p
                        className="muted"
                        style={{
                            margin:
                                '12px 0 0',

                            lineHeight:
                                1.8,

                            fontSize:
                                13
                        }}
                    >
                        Chrome에서 Dear Sunshine Home을 연 뒤 오른쪽 상단 메뉴를 누르고
                        ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택해 주세요.
                    </p>
                </details>

            </section>


            <section
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    ACCOUNT
                </p>

                <h2>
                    계정 관리
                </h2>

                <div
                    style={{
                        display:
                            'grid',

                        gap:
                            10
                    }}
                >

                    <Link
                        href="/forgot-password"
                        className="secondary-button"
                        style={{
                            textAlign:
                                'center'
                        }}
                    >
                        비밀번호 변경
                    </Link>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={logout}
                    >
                        로그아웃
                    </button>

                </div>

            </section>

        </main>

    );
}
