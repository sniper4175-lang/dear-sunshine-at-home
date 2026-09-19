/*
 * Dear Sunshine Home - APP INSTALL 문구 정리
 *
 * APP INSTALL 카드 안에 남아 있는
 * "Dear Sunshine at Home" 문구만
 * "Dear Sunshine Home"으로 바꿉니다.
 *
 * 다른 화면의 문구에는 영향을 주지 않습니다.
 */

const OLD_NAME = 'Dear Sunshine at Home';
const NEW_NAME = 'Dear Sunshine Home';

function findInstallCard() {
  if (typeof document === 'undefined') return null;

  const candidates = Array.from(
    document.querySelectorAll('section, article, div')
  ).filter((element) => {
    const text = element.textContent || '';
    return (
      text.includes('APP INSTALL') &&
      text.includes('홈 화면에 추가하기') &&
      text.includes(OLD_NAME)
    );
  });

  if (candidates.length === 0) return null;

  // 가장 작은 범위의 카드 요소를 선택해 다른 화면에 영향이 없도록 합니다.
  candidates.sort(
    (a, b) => (a.textContent || '').length - (b.textContent || '').length
  );

  return candidates[0];
}

function replaceInstallCardBrand() {
  const card = findInstallCard();
  if (!card) return;

  const walker = document.createTreeWalker(
    card,
    NodeFilter.SHOW_TEXT
  );

  const nodes = [];
  let node = walker.nextNode();

  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  for (const textNode of nodes) {
    const value = textNode.nodeValue || '';

    if (value.includes(OLD_NAME)) {
      textNode.nodeValue = value.split(OLD_NAME).join(NEW_NAME);
    }
  }
}

function startInstallBrandFix() {
  replaceInstallCardBrand();

  if (!document.body) return;

  let queued = false;

  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;

    requestAnimationFrame(() => {
      queued = false;
      replaceInstallCardBrand();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      startInstallBrandFix,
      { once: true }
    );
  } else {
    startInstallBrandFix();
  }
}
