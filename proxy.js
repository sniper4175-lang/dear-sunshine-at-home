import {
    updateSession
} from './lib/supabase-proxy';


export async function proxy(
    request
) {

    return await updateSession(
        request
    );
}


export const config = {

    matcher: [

        /*
         * 아래 정적 파일 요청을 제외하고
         * 대부분의 페이지/API 요청에서
         * Supabase Auth 세션을 갱신
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'

    ]

};