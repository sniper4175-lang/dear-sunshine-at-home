const fs = require('fs');
const path = require('path');

const root = process.cwd();
const patchRoot = __dirname;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(root, '.home-package-patch-backup', stamp);

function fail(message) {
  console.error(`\n[Home Package Patch v2] ${message}\n`);
  process.exit(1);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`파일을 찾을 수 없습니다: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}
function backup(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function write(rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function patchFile(rel, mutator) {
  const content = read(rel);
  const next = mutator(content);
  if (next === content) {
    console.log(`- 이미 적용됨/변경 없음: ${rel}`);
    return;
  }
  backup(rel);
  write(rel, next);
  console.log(`✓ 수정: ${rel}`);
}
function copyPatchFile(rel) {
  const src = path.join(patchRoot, 'patch-files', rel);
  if (!fs.existsSync(src)) fail(`패치 파일 누락: patch-files/${rel}`);
  backup(rel);
  const dst = path.join(root, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`✓ 추가/덮어쓰기: ${rel}`);
}
function replaceBetween(content, startText, endText, replacement, label) {
  const start = content.indexOf(startText);
  if (start < 0) fail(`${label}: 시작 위치를 찾지 못했습니다.`);
  const end = content.indexOf(endText, start + startText.length);
  if (end < 0) fail(`${label}: 끝 위치를 찾지 못했습니다.`);
  return content.slice(0, start) + replacement + content.slice(end);
}
function addImportAfter(content, anchor, addition, marker, label) {
  if (content.includes(marker)) return content;
  if (!content.includes(anchor)) fail(`${label}: import 위치를 찾지 못했습니다.`);
  return content.replace(anchor, anchor + addition);
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  fail('package.json이 없습니다. dear-sunshine-at-home 프로젝트 최상위 폴더에서 실행해주세요.');
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'dear-sunshine-at-home') {
  fail(`다른 프로젝트로 보입니다. package.json name=${pkg.name}`);
}

console.log('\n=== Dear Sunshine Home Package Patch v2 ===');
console.log('현재 코드의 들여쓰기/포맷 차이를 허용하도록 수정된 패치입니다.\n');

// 새 파일/핵심 로직은 항상 최신 패치 버전으로 맞춤
copyPatchFile('lib/home-package.js');
copyPatchFile('lib/content-access.js');
copyPatchFile('app/home-package/page.js');
copyPatchFile('supabase/home-package-mode.sql');

// membership.js
patchFile('lib/membership.js', (content) => {
  content = addImportAfter(
    content,
    "import {\n    createAdminSupabase\n} from './supabase-server';\n",
    "\nimport {\n    getHomePackageMembership,\n    mergeProductMemberships\n} from './home-package';\n",
    "from './home-package'",
    'membership import'
  );

  if (!content.includes('const effectiveMembership =')) {
    const anchor = /\) \|\| null;\n\n\n\s*let billingProfile =/;
    const match = content.match(anchor);
    if (!match) fail('membership.js에서 validMembership 다음 위치를 찾지 못했습니다.');
    content = content.replace(
      anchor,
      `) || null;\n\n\n    const homePackage =\n        await getHomePackageMembership(\n            db,\n            user.id\n        );\n\n\n    const effectiveMembership =\n        mergeProductMemberships(\n            validMembership,\n            homePackage\n        );\n\n\n    let billingProfile =`
    );
  }

  if (!content.includes('songClubMembership:')) {
    const oldReturn = /return \{\s*user,\s*membership:\s*validMembership,\s*billingProfile\s*\};/m;
    if (!oldReturn.test(content)) fail('membership.js return 블록을 찾지 못했습니다.');
    content = content.replace(oldReturn,
`return {
        user,
        membership:
            effectiveMembership,
        songClubMembership:
            validMembership,
        homePackage,
        billingProfile
    };`);
  }
  return content;
});

// app/page.js
patchFile('app/page.js', (content) => {
  if (!content.includes("from 'next/navigation'")) {
    content = content.replace(
      "import Link from 'next/link';\n",
      "import Link from 'next/link';\nimport { redirect } from 'next/navigation';\n"
    );
  }

  if (!content.includes('songClubMembership,')) {
    const re = /const \{\s*user,\s*membership\s*\}\s*=\s*await getCurrentMembership\(\);/m;
    if (!re.test(content)) fail('app/page.js membership destructuring을 찾지 못했습니다.');
    content = content.replace(re,
`const {
        user,
        membership,
        songClubMembership,
        homePackage
    } =
        await getCurrentMembership();`);
  }

  if (!content.includes("redirect(\n            '/home-package'")) {
    const loggedBlock = /const loggedIn\s*=\s*Boolean\(\s*user\s*\);/m;
    const m = content.match(loggedBlock);
    if (!m) fail('app/page.js loggedIn 블록을 찾지 못했습니다.');
    content = content.replace(loggedBlock,
`${m[0]}


    if (
        loggedIn &&
        homePackage &&
        !songClubMembership
    ) {
        redirect(
            '/home-package'
        );
    }`);
  }
  return content;
});

// app/library/page.js
patchFile('app/library/page.js', (content) => {
  if (!content.includes("from '../../lib/content-access'")) {
    const anchor = "import {\n    todayKST\n} from '../../lib/release-date';\n";
    if (!content.includes(anchor)) fail('library page import 위치를 찾지 못했습니다.');
    content = content.replace(anchor, anchor + "\nimport {\n    canAccessSong\n} from '../../lib/content-access';\n");
  }

  if (!content.includes('canAccessSong(\n                        song,')) {
    const start = content.indexOf('    const songs =');
    const end = content.indexOf('\n\n\n    /*', start);
    if (start < 0 || end < 0) fail('library page songs 필터 블록을 찾지 못했습니다.');
    const block = content.slice(start, end);
    if (!block.includes('userPrograms.includes')) {
      // 이미 다른 최신 구현이면 건드리지 않음
      return content;
    }
    const replacement = `    const songs =\n        loggedIn &&\n        membership\n            ? allSongs.filter(\n                song =>\n                    canAccessSong(\n                        song,\n                        membership,\n                        userPrograms\n                    )\n            )\n            : allSongs;`;
    content = content.slice(0, start) + replacement + content.slice(end);
  }
  return content;
});

// LibraryClient.js — 이전 패치가 실패한 핵심 부분. 포맷과 무관하게 함수 전체를 교체.
patchFile('components/LibraryClient.js', (content) => {
  const clientAccessFn = `function canAccessSong(
    song,
    loggedIn,
    membership,
    userPrograms
) {

    if (
        !loggedIn ||
        !membership
    ) {
        return false;
    }

    const homePackageSongIds =
        Array.isArray(
            membership.home_package_unlocked_song_ids
        )
            ? membership.home_package_unlocked_song_ids
            : [];

    if (
        song?.id &&
        homePackageSongIds.includes(
            song.id
        )
    ) {
        return true;
    }

    if (
        membership.product_type === 'home_package' ||
        membership.song_club_active === false
    ) {
        return false;
    }

    if (
        !Array.isArray(
            userPrograms
        ) ||
        !song?.program
    ) {
        return false;
    }

    return userPrograms.includes(
        song.program
    );
}


`;

  if (!content.includes('membership.home_package_unlocked_song_ids')) {
    content = replaceBetween(
      content,
      'function canAccessSong(',
      'function monthKey(',
      clientAccessFn,
      'LibraryClient canAccessSong'
    );
  }

  if (!content.includes('membership?.home_package_program')) {
    const start = content.indexOf('    const availablePrograms =');
    const end = content.indexOf('    const [\n        mainView,', start);
    if (start < 0 || end < 0) fail('LibraryClient availablePrograms 블록을 찾지 못했습니다.');
    const replacement = `    const availablePrograms =\n        useMemo(\n            () =>\n                PROGRAM_OPTIONS.filter(\n                    program =>\n                        userPrograms.includes(\n                            program\n                        ) ||\n                        membership?.home_package_program ===\n                            program\n                ),\n            [\n                userPrograms,\n                membership\n            ]\n        );\n`;
    content = content.slice(0, start) + replacement + content.slice(end);
  }
  return content;
});

// MY 화면
patchFile('components/MyPageClient.js', (content) => {
  if (!content.includes("membership?.product_type === 'home_package'")) {
    content = content.replace(
      '                    Dear Sunshine Song Club 계정',
      `                    {membership?.product_type === 'home_package'\n                        ? 'Dear Sunshine Home Package 계정'\n                        : membership?.product_type === 'combined'\n                            ? 'Dear Sunshine Song Club + Home Package 계정'\n                            : 'Dear Sunshine Song Club 계정'}`
    );

    content = content.replace(
      '                                    ☀️ Song Club 이용 중',
      `                                    {membership?.product_type === 'home_package'\n                                        ? '🏠 Home Package 이용 중'\n                                        : membership?.product_type === 'combined'\n                                            ? '☀️ Song Club + 🏠 Home Package 이용 중'\n                                            : '☀️ Song Club 이용 중'}`
    );

    const oldAction = `                        <Link\n                            href="/membership"\n                            className="secondary-button wide"\n                            style={{\n                                marginTop:\n                                    18\n                            }}\n                        >\n                            이용권 자세히 보기\n                        </Link>`;
    if (content.includes(oldAction)) {
      content = content.replace(oldAction, `                        <Link\n                            href={\n                                membership?.product_type === 'home_package'\n                                    ? '/home-package'\n                                    : '/membership'\n                            }\n                            className="secondary-button wide"\n                            style={{\n                                marginTop:\n                                    18\n                            }}\n                        >\n                            {membership?.product_type === 'home_package'\n                                ? 'Home Package 열기'\n                                : '이용권 자세히 보기'}\n                        </Link>\n\n                        {membership?.product_type === 'combined' && (\n                            <Link\n                                href="/home-package"\n                                className="secondary-button wide"\n                                style={{ marginTop: 10 }}\n                            >\n                                🏠 Home Package 열기\n                            </Link>\n                        )}`);
    }
  }

  content = content.replaceAll('Song Club을 홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요.', 'Dear Sunshine at Home을 홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요.');
  content = content.replaceAll('Safari에서 Song Club을 연 뒤 공유 버튼을 누르고', 'Safari에서 Dear Sunshine at Home을 연 뒤 공유 버튼을 누르고');
  content = content.replaceAll('Chrome에서 Song Club을 연 뒤 오른쪽 상단 메뉴를 누르고', 'Chrome에서 Dear Sunshine at Home을 연 뒤 오른쪽 상단 메뉴를 누르고');
  return content;
});

// 노래 상세
patchFile('app/song/[slug]/page.js', (content) => {
  if (!content.includes('membership?.product_type === "home_package"')) {
    const oldBack = `<Link className="back-link" href="/library">\n        ← 노래 목록\n      </Link>`;
    if (content.includes(oldBack)) {
      content = content.replace(oldBack, `<Link\n        className="back-link"\n        href={\n          membership?.product_type === "home_package"\n            ? "/home-package"\n            : "/library"\n        }\n      >\n        ← {membership?.product_type === "home_package" ? "Home Package" : "노래 목록"}\n      </Link>`);
    }

    const oldElse = `  } else {\n    lockedTitle = "현재 이용할 수 없는 콘텐츠예요";`;
    if (content.includes(oldElse)) {
      content = content.replace(oldElse, `  } else if (membership?.product_type === "home_package") {\n    lockedTitle = "아직 열리지 않은 노래예요";\n\n    lockedDescription =\n      "Home Package에서는 시작일을 기준으로 매주 한 곡씩 자동으로 열려요.";\n\n    lockedButton = "Home Package 보기";\n\n    lockedHref = "/home-package";\n  } else {\n    lockedTitle = "현재 이용할 수 없는 콘텐츠예요";`);
    }

    content = content.replace(
      '                  MONTHLY SONG CLUB',
      `                  {membership?.product_type === "home_package"\n                    ? "HOME PACKAGE"\n                    : "MONTHLY SONG CLUB"}`
    );
  }
  return content;
});

// 리소스 API: Home Package 권한 판정에 song.id 전달
const apiFiles = [
  'app/api/audio-url/route.js',
  'app/api/lyrics-url/route.js',
  'app/api/play-ideas-url/route.js',
  'app/api/printable-url/route.js'
];
for (const rel of apiFiles) {
  patchFile(rel, (content) => {
    if (!/\.select\(\s*`[\s\S]*?\bid,/.test(content)) {
      const idx = content.indexOf(".from('ds_content_songs')");
      const idx2 = idx < 0 ? content.indexOf(".from(\n                    'ds_content_songs'\n                )") : idx;
      const searchFrom = idx >= 0 ? idx : idx2;
      if (searchFrom < 0) fail(`${rel}: ds_content_songs 조회를 찾지 못했습니다.`);
      const slugIdx = content.indexOf('slug,', searchFrom);
      if (slugIdx < 0) fail(`${rel}: select의 slug 위치를 찾지 못했습니다.`);
      const indentStart = content.lastIndexOf('\n', slugIdx) + 1;
      const indent = content.slice(indentStart, slugIdx);
      content = content.slice(0, slugIdx) + `id,\n${indent}` + content.slice(slugIdx);
    }

    if (!content.includes('id: song.id')) {
      content = content.replace(
        /\{\s*program:\s*song\.program\s*\}/m,
        '{ id: song.id, program: song.program }'
      );
      if (!content.includes('id: song.id')) {
        fail(`${rel}: canAccessSong에 song.id를 전달할 위치를 찾지 못했습니다.`);
      }
    }
    return content;
  });
}

// 앱 이름 확장
patchFile('app/layout.js', (content) => {
  return content
    .replaceAll('Dear Sunshine Monthly Song Club', 'Dear Sunshine at Home')
    .replaceAll('Sunshine Monthly Song Club', 'Dear Sunshine at Home');
});

if (fs.existsSync(path.join(root, 'public/manifest.webmanifest'))) {
  patchFile('public/manifest.webmanifest', (content) => {
    return content
      .replaceAll('Dear Sunshine Monthly Song Club', 'Dear Sunshine at Home')
      .replaceAll('Sunshine Monthly Song Club', 'Dear Sunshine at Home');
  });
}

if (fs.existsSync(path.join(root, 'components/SiteFooter.js'))) {
  patchFile('components/SiteFooter.js', (content) =>
    content.replaceAll('Dear Sunshine Monthly Song Club', 'Dear Sunshine at Home')
  );
}

// 백업 폴더 제외
const gitignorePath = path.join(root, '.gitignore');
let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
if (!gitignore.includes('.home-package-patch-backup/')) {
  gitignore += `${gitignore.endsWith('\n') || gitignore.length === 0 ? '' : '\n'}.home-package-patch-backup/\n`;
  fs.writeFileSync(gitignorePath, gitignore, 'utf8');
  console.log('✓ .gitignore에 패치 백업 폴더 추가');
}

console.log('\n✅ Home Package Patch v2 적용 완료');
console.log(`백업: ${path.relative(root, backupRoot)}`);
console.log('\n다음 순서:');
console.log('1) npm run build');
console.log('2) 빌드가 성공하면 Supabase SQL Editor에서 supabase/home-package-mode.sql 실행 (이미 실행했다면 생략)');
console.log('3) git add .');
console.log('4) git commit -m "Add Home Package mode"');
console.log('5) git push\n');
