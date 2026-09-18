const fs = require('fs');
const path = require('path');

const root = process.cwd();
const adminClientPath = path.join(root, 'components', 'AdminClient.js');
const manageRoutePath = path.join(root, 'app', 'api', 'admin', 'manage', 'route.js');
const sqlSource = path.join(__dirname, 'patch-files', 'supabase', 'home-package-mode.sql');
const sqlTarget = path.join(root, 'supabase', 'home-package-mode.sql');
const componentSnippetPath = path.join(__dirname, 'patch-files', 'HomePackageMemberManagement.snippet.txt');
const apiSnippetPath = path.join(__dirname, 'patch-files', 'home-package-api.snippet.txt');

function fail(message) {
  console.error(`\n[Home Package Admin Patch] ${message}\n`);
  process.exit(1);
}

for (const required of [adminClientPath, manageRoutePath, componentSnippetPath, apiSnippetPath]) {
  if (!fs.existsSync(required)) {
    fail(`필수 파일을 찾지 못했습니다: ${required}`);
  }
}

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const backupDir = path.join(root, `_patch_backup_home_package_admin_${stamp}`);
fs.mkdirSync(path.join(backupDir, 'components'), { recursive: true });
fs.mkdirSync(path.join(backupDir, 'app', 'api', 'admin', 'manage'), { recursive: true });
fs.copyFileSync(adminClientPath, path.join(backupDir, 'components', 'AdminClient.js'));
fs.copyFileSync(manageRoutePath, path.join(backupDir, 'app', 'api', 'admin', 'manage', 'route.js'));
console.log(`✓ 백업 생성: ${path.basename(backupDir)}`);

let admin = fs.readFileSync(adminClientPath, 'utf8');
let route = fs.readFileSync(manageRoutePath, 'utf8');
const componentSnippet = fs.readFileSync(componentSnippetPath, 'utf8');
const apiSnippet = fs.readFileSync(apiSnippetPath, 'utf8');

// 1) 관리자 내비게이션에 Home Package 회원 탭 추가
if (!admin.includes('["homePackageMembers", "Home Package 회원"]') &&
    !admin.includes("['homePackageMembers', 'Home Package 회원']")) {
  const navPatterns = [
    /\["athomeMembers",\s*"Song Club 회원"\],/,
    /\['athomeMembers',\s*'Song Club 회원'\],/
  ];

  let patched = false;
  for (const pattern of navPatterns) {
    if (pattern.test(admin)) {
      admin = admin.replace(pattern, (match) => `${match}\n\n          ["homePackageMembers", "Home Package 회원"],`);
      patched = true;
      break;
    }
  }

  if (!patched) {
    fail('Song Club 회원 탭 위치를 찾지 못했습니다. AdminClient.js 구조가 예상과 다릅니다.');
  }
  console.log('✓ 관리자 메뉴에 Home Package 회원 탭 추가');
} else {
  console.log('- Home Package 회원 탭 이미 적용됨');
}

// 2) 탭 렌더링 추가
if (!admin.includes('tab === "homePackageMembers"') &&
    !admin.includes("tab === 'homePackageMembers'")) {
  const renderRegex = /\{tab\s*===\s*["']athomeMembers["']\s*&&\s*\(\s*<AtHomeMemberManagement[\s\S]*?\/>\s*\)\}/;
  const match = admin.match(renderRegex);
  if (!match) {
    fail('Song Club 회원 관리 렌더링 위치를 찾지 못했습니다.');
  }

  const block = `${match[0]}\n\n      {tab === "homePackageMembers" && (\n        <HomePackageMemberManagement\n          authUsers={d.authUsers}\n          contents={d.contents}\n          loading={loading}\n        />\n      )}`;

  admin = admin.replace(renderRegex, block);
  console.log('✓ Home Package 회원 관리 화면 연결');
} else {
  console.log('- Home Package 회원 관리 화면 연결 이미 적용됨');
}

// 3) Home Package 관리자 UI 컴포넌트 추가
if (!admin.includes('function HomePackageMemberManagement(')) {
  admin += componentSnippet;
  console.log('✓ Home Package 관리자 UI 컴포넌트 추가');
} else {
  console.log('- Home Package 관리자 UI 컴포넌트 이미 적용됨');
}

// 4) 관리자 API actions 추가
if (!route.includes('getHomePackageAdminData')) {
  const unsupportedIndex = route.lastIndexOf('지원하지 않는 작업');
  if (unsupportedIndex === -1) {
    fail('manage/route.js에서 "지원하지 않는 작업" 위치를 찾지 못했습니다.');
  }

  const commentStart = route.lastIndexOf('/*', unsupportedIndex);
  if (commentStart === -1) {
    fail('manage/route.js API 삽입 위치를 찾지 못했습니다.');
  }

  route = route.slice(0, commentStart) + apiSnippet + '\n\n        ' + route.slice(commentStart);
  console.log('✓ Home Package 관리자 API 추가');
} else {
  console.log('- Home Package 관리자 API 이미 적용됨');
}

fs.writeFileSync(adminClientPath, admin, 'utf8');
fs.writeFileSync(manageRoutePath, route, 'utf8');

if (fs.existsSync(sqlSource)) {
  fs.mkdirSync(path.dirname(sqlTarget), { recursive: true });
  fs.copyFileSync(sqlSource, sqlTarget);
  console.log('✓ Supabase SQL 파일 복사: supabase/home-package-mode.sql');
}

console.log('\n=== Home Package 관리자 패치 적용 완료 ===');
console.log('1) npm run build');
console.log('2) SQL을 아직 실행하지 않았다면 Supabase SQL Editor에서 supabase/home-package-mode.sql 실행');
console.log('3) git add .');
console.log('4) git commit -m "Add Home Package admin management"');
console.log('5) git push');
