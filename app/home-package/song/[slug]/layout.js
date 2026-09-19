export default function HomePackageSongLayout({ children }) {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    let supabaseOrigin = '';

    try {
        if (supabaseUrl) {
            supabaseOrigin = new URL(
                supabaseUrl
            ).origin;
        }
    } catch {
        supabaseOrigin = '';
    }

    return (
        <>
            {supabaseOrigin ? (
                <>
                    <link
                        rel="preconnect"
                        href={supabaseOrigin}
                        crossOrigin="anonymous"
                    />
                    <link
                        rel="dns-prefetch"
                        href={supabaseOrigin}
                    />
                </>
            ) : null}

            {children}
        </>
    );
}
