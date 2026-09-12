const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error('\n❌ ' + message);
  process.exit(1);
}

function backup(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dir, `${name}_backup_${stamp}${ext}`);
  fs.copyFileSync(filePath, backupPath);
  console.log('백업:', backupPath);
  return backupPath;
}

function replaceOnce(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label} 위치를 찾지 못했습니다.`);
  }
  return source.replace(pattern, replacement);
}

function findMatchingDivEnd(source, startIndex) {
  const tokenRegex = /<\/?div\b[^>]*>/g;
  tokenRegex.lastIndex = startIndex;
  let depth = 0;
  let started = false;
  let match;

  while ((match = tokenRegex.exec(source))) {
    const token = match[0];
    if (token.startsWith('</')) {
      depth -= 1;
      if (started && depth === 0) {
        return tokenRegex.lastIndex;
      }
    } else {
      depth += 1;
      started = true;
    }
  }
  return -1;
}

function patchLibraryClient(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;

  // 1) userPrograms prop 추가
  if (!/\buserPrograms\b/.test(
    (code.match(/export\s+default\s+function\s+LibraryClient\s*\(\s*\{[\s\S]*?\}\s*\)/) || [''])[0]
  )) {
    code = replaceOnce(
      code,
      /(export\s+default\s+function\s+LibraryClient\s*\(\s*\{[\s\S]*?\bmembership\b)([\s\S]*?\}\s*\))/,
      `$1,\n    userPrograms = []$2`,
      'LibraryClient userPrograms prop'
    );
  }

  // 2) 과거 Basic/Premium 접근 함수 제거
  const accessFunction = /function\s+canAccessSong\s*\([\s\S]*?\n\}\s*\n\s*(?=export\s+default\s+function\s+LibraryClient)/;
  if (accessFunction.test(code)) {
    code = code.replace(
      accessFunction,
`function canAccessSong(
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

    return (
        Array.isArray(userPrograms) &&
        userPrograms.includes(
            song.program
        )
    );
}

`
    );
  }

  // 3) selectedProgram 초기값: 한 클래스면 해당 클래스, 둘 다면 전체
  code = code.replace(
    /useState\(\s*['"]all['"]\s*\)(\s*;?)/,
    `useState(\n            () =>\n                Array.isArray(userPrograms) &&\n                userPrograms.length === 1\n                    ? userPrograms[0]\n                    : 'all'\n        )$1`
  );

  // 4) 프로그램 권한/보이는 곡 계산 추가
  if (!code.includes('const allowedPrograms =')) {
    const marker = code.match(/(const\s+\[\s*selectedProgram[\s\S]*?;\s*)/);
    if (!marker) {
      throw new Error('selectedProgram 상태 위치를 찾지 못했습니다.');
    }

    const insert =
`

    const PROGRAM_OPTIONS = [
        'Sunshine Toddler',
        'Melody Book Club'
    ];


    const allowedPrograms =
        useMemo(
            () =>
                PROGRAM_OPTIONS.filter(
                    program =>
                        Array.isArray(
                            userPrograms
                        ) &&
                        userPrograms.includes(
                            program
                        )
                ),
            [
                userPrograms
            ]
        );


    /*
     * 로그인 + 활성 멤버십 회원에게는
     * 관리자가 허용한 클래스의 곡만 보여줍니다.
     *
     * 비회원/로그아웃 상태는 기존처럼
     * 곡 목록 자체는 볼 수 있고 재생 권한만 잠깁니다.
     */
    const visibleSongs =
        useMemo(
            () => {
                if (
                    !loggedIn ||
                    !membership
                ) {
                    return songs;
                }

                if (
                    allowedPrograms.length === 0
                ) {
                    return [];
                }

                return songs.filter(
                    song =>
                        allowedPrograms.includes(
                            song.program
                        )
                );
            },
            [
                songs,
                loggedIn,
                membership,
                allowedPrograms
            ]
        );
`;
    code = code.replace(marker[0], marker[0] + insert);
  }

  // 5) filteredSongs는 visibleSongs 기준
  const filteredBlock = /const\s+filteredSongs\s*=\s*useMemo\s*\([\s\S]*?\n\s*\);\s*/;
  const filteredReplacement =
`const filteredSongs =
        useMemo(
            () => {

                if (
                    selectedProgram ===
                    'all'
                ) {
                    return visibleSongs;
                }


                return visibleSongs.filter(
                    song =>
                        song.program ===
                        selectedProgram
                );

            },
            [
                visibleSongs,
                selectedProgram
            ]
        );

`;
  if (filteredBlock.test(code)) {
    code = code.replace(filteredBlock, filteredReplacement);
  } else if (!code.includes('return visibleSongs')) {
    throw new Error('filteredSongs 영역을 찾지 못했습니다.');
  }

  // 6) Basic / Premium planLabel 계산 제거
  code = code.replace(
    /\n\s*const\s+planLabel\s*=[\s\S]*?;\s*(?=\n\s*return\s*\()/,
    '\n'
  );

  // 7) Basic 상태 pill 제거: {planLabel}이 들어있는 div만 삭제
  const planPos = code.indexOf('{planLabel}');
  if (planPos !== -1) {
    const before = code.slice(0, planPos);
    const divStart = before.lastIndexOf('<div');
    if (divStart !== -1) {
      const divEnd = findMatchingDivEnd(code, divStart);
      if (divEnd !== -1 && divEnd > planPos) {
        code = code.slice(0, divStart) + code.slice(divEnd);
      }
    }
  }

  // 남아 있는 Basic 문구 중 Library UI 표시용만 방어적으로 제거
  code = code.replace(/☀️\s*\{planLabel\}/g, '');
  code = code.replace(/['"]Basic['"]/g, "'Song Club'");

  // 8) 프로그램 필터를 권한 기반 동적 탭으로 교체
  const filterComment = code.indexOf('{/* 프로그램 필터 */}');
  if (filterComment !== -1) {
    const firstDiv = code.indexOf('<div', filterComment);
    if (firstDiv === -1) {
      throw new Error('프로그램 필터 div를 찾지 못했습니다.');
    }
    const endDiv = findMatchingDivEnd(code, firstDiv);
    if (endDiv === -1) {
      throw new Error('프로그램 필터 끝을 찾지 못했습니다.');
    }

    const dynamicTabs =
`{/* 프로그램 필터 — 회원 권한이 있는 클래스만 표시 */}
            {allowedPrograms.length > 0 && (
                <div
                    style={{
                        display:
                            'flex',

                        gap:
                            8,

                        overflowX:
                            'auto',

                        paddingBottom:
                            18
                    }}
                >

                    {allowedPrograms.length > 1 && (
                        <button
                            type="button"
                            onClick={() =>
                                setSelectedProgram(
                                    'all'
                                )
                            }
                            style={{
                                flexShrink:
                                    0,

                                border:
                                    'none',

                                borderRadius:
                                    999,

                                padding:
                                    '10px 16px',

                                cursor:
                                    'pointer',

                                fontWeight:
                                    800,

                                background:
                                    selectedProgram ===
                                    'all'
                                        ? '#f9b846'
                                        : '#f4eee6',

                                color:
                                    '#3d3026'
                            }}
                        >
                            전체
                        </button>
                    )}


                    {allowedPrograms.map(
                        program => (
                            <button
                                key={
                                    program
                                }
                                type="button"
                                onClick={() =>
                                    setSelectedProgram(
                                        program
                                    )
                                }
                                style={{
                                    flexShrink:
                                        0,

                                    border:
                                        'none',

                                    borderRadius:
                                        999,

                                    padding:
                                        '10px 16px',

                                    cursor:
                                        'pointer',

                                    fontWeight:
                                        800,

                                    background:
                                        selectedProgram ===
                                        program
                                            ? '#f9b846'
                                            : '#f4eee6',

                                    color:
                                        '#3d3026'
                                }}
                            >
                                {program}
                            </button>
                        )
                    )}

                </div>
            )}`;
    code = code.slice(0, filterComment) + dynamicTabs + code.slice(endDiv);
  } else {
    console.log('ℹ️ LibraryClient에 "프로그램 필터" 주석이 없어 탭 블록 자동 교체는 건너뜁니다.');
  }

  // 9) 곡 접근 판정에 프로그램 권한 전달
  code = code.replace(
    /canAccessSong\(\s*song\s*,\s*loggedIn\s*,\s*membership\s*\)/g,
    `canAccessSong(
                                    song,
                                    loggedIn,
                                    membership,
                                    userPrograms
                                )`
  );

  // 10) PlaylistPlayer가 있다면 허용된 곡만 전달
  code = code.replace(
    /(<PlaylistPlayer\b[\s\S]{0,1000}?songs\s*=\s*\{\s*)songs(\s*\})/,
    '$1visibleSongs$2'
  );

  if (code === original) {
    throw new Error('LibraryClient에서 변경할 내용을 찾지 못했습니다.');
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ LibraryClient 패치 완료');
}

function patchLibraryPage(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;

  // 경로는 app/library/page.js 기준
  if (!code.includes("getUserPrograms")) {
    const lastImport = [...code.matchAll(/^import[\s\S]*?;\s*$/gm)].pop();
    if (!lastImport) {
      throw new Error('app/library/page.js import 영역을 찾지 못했습니다.');
    }
    const insertion =
`
import {
    createAdminSupabase
} from '../../lib/supabase-server';

import {
    getUserPrograms
} from '../../lib/program-access';
`;
    const pos = lastImport.index + lastImport[0].length;
    code = code.slice(0, pos) + insertion + code.slice(pos);
  }

  if (!code.includes('let userPrograms')) {
    const loggedInPattern = /const\s+loggedIn\s*=\s*Boolean\s*\(\s*user\s*\)\s*;?/;
    const m = code.match(loggedInPattern);
    if (!m) {
      throw new Error('loggedIn 계산 위치를 찾지 못했습니다.');
    }

    const insert =
`

    const db =
        createAdminSupabase();


    let userPrograms =
        [];


    if (user) {

        try {

            userPrograms =
                await getUserPrograms(
                    db,
                    user.id
                );

        } catch (error) {

            console.error(
                'Library program access error:',
                error
            );

        }

    }
`;
    code = code.replace(loggedInPattern, m[0] + insert);
  }

  // LibraryClient 호출부에 userPrograms 전달
  if (!/<LibraryClient[\s\S]*?userPrograms\s*=/.test(code)) {
    const start = code.indexOf('<LibraryClient');
    if (start === -1) {
      throw new Error('app/library/page.js에서 <LibraryClient>를 찾지 못했습니다.');
    }
    const close = code.indexOf('/>', start);
    if (close === -1) {
      throw new Error('LibraryClient JSX 끝을 찾지 못했습니다.');
    }
    const addition =
`
                userPrograms={
                    userPrograms
                }
            `;
    code = code.slice(0, close) + addition + code.slice(close);
  }

  if (code === original) {
    console.log('ℹ️ app/library/page.js는 이미 필요한 변경이 적용되어 있습니다.');
  } else {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✅ app/library/page.js 패치 완료');
  }
}

function main() {
  const rawProject = process.argv[2];
  if (!rawProject) {
    fail('프로젝트 폴더 경로가 전달되지 않았습니다.');
  }

  const project = path.resolve(rawProject.replace(/^"|"$/g, ''));
  const packageJson = path.join(project, 'package.json');
  if (!fs.existsSync(packageJson)) {
    fail('선택한 폴더에서 package.json을 찾지 못했습니다.');
  }

  const libraryClient = path.join(project, 'components', 'LibraryClient.js');
  const libraryPage = path.join(project, 'app', 'library', 'page.js');

  if (!fs.existsSync(libraryClient)) {
    fail('components/LibraryClient.js를 찾지 못했습니다.');
  }
  if (!fs.existsSync(libraryPage)) {
    fail('app/library/page.js를 찾지 못했습니다.');
  }

  console.log('\nDear Sunshine Song Library 패치를 시작합니다.');
  console.log('프로젝트:', project);

  const backups = [];
  try {
    backups.push([libraryClient, backup(libraryClient)]);
    backups.push([libraryPage, backup(libraryPage)]);

    patchLibraryClient(libraryClient);
    patchLibraryPage(libraryPage);

    console.log('\n✅ 패치 완료');
    console.log('변경 내용:');
    console.log('- Basic / Premium UI 제거');
    console.log('- 회원에게 허용된 클래스의 탭만 표시');
    console.log('- 한 클래스 권한: 해당 클래스 탭만 표시');
    console.log('- 두 클래스 권한: 전체 + 두 클래스 탭 표시');
    console.log('- 회원에게 허용되지 않은 프로그램 곡은 목록/플레이리스트에서 제외');
    console.log('\n다음 단계: npm run build');
  } catch (err) {
    console.error('\n❌ 패치 중 오류:', err.message);
    console.error('안전을 위해 원본 파일을 복구합니다.');

    for (const [target, copy] of backups.reverse()) {
      try {
        fs.copyFileSync(copy, target);
      } catch {}
    }
    process.exit(1);
  }
}

main();
