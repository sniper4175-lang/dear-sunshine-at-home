import {
    createClient
} from '@supabase/supabase-js';


export function createAdminSupabase() {

    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;


    const secretKey =
        process.env
            .SUPABASE_SECRET_KEY;


    if (
        !url ||
        !secretKey
    ) {

        throw new Error(
            'Supabase 환경변수가 설정되지 않았습니다.'
        );

    }


    return createClient(
        url,
        secretKey,
        {
            auth: {
                persistSession:
                    false,

                autoRefreshToken:
                    false
            }
        }
    );
}