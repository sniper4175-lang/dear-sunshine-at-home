/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /*
     * Next 15+에서는 동적 Page segment의 client router cache 기본값이 0초라
     * 탭을 다시 열 때 같은 RSC를 즉시 재요청합니다.
     * 30초 동안 방문한 페이지 payload를 재사용해 홈↔노래↔MY 이동 시
     * 같은 서버 조회가 반복되는 횟수를 크게 줄입니다.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
