"use client";

import { useEffect } from "react";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function isResourceImage(img) {
  const src = String(
    img.currentSrc || img.getAttribute("src") || "",
  ).toLowerCase();

  if (
    !src ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return false;
  }

  const hint = [
    src,
    img.getAttribute("alt") || "",
    img.getAttribute("class") || "",
  ]
    .join(" ")
    .toLowerCase();

  // Dear Sunshine 자료 이미지 / Supabase Storage 이미지를 우선 대상으로 합니다.
  return (
    hint.includes("supabase") ||
    hint.includes("storage") ||
    hint.includes("lyric") ||
    hint.includes("lyrics") ||
    hint.includes("printable") ||
    hint.includes("flash") ||
    hint.includes("worksheet") ||
    hint.includes("play-idea") ||
    hint.includes("play_idea") ||
    hint.includes("activity")
  );
}

function rememberLayout(element) {
  const rect = element.getBoundingClientRect();

  if (rect.height > 80) {
    element.dataset.dsOriginalMinHeight =
      element.style.minHeight || "";
    element.style.minHeight = `${Math.round(rect.height)}px`;
  }
}

function restoreLayout(element) {
  if ("dsOriginalMinHeight" in element.dataset) {
    element.style.minHeight =
      element.dataset.dsOriginalMinHeight || "";
    delete element.dataset.dsOriginalMinHeight;
  }
}

export default function ResourcePerformanceClient() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      800;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const element = entry.target;

          if (element instanceof HTMLImageElement) {
            const originalSrc =
              element.dataset.dsDeferredSrc;
            const originalSrcSet =
              element.dataset.dsDeferredSrcset;

            if (originalSrc) {
              if (originalSrcSet) {
                element.setAttribute(
                  "srcset",
                  originalSrcSet,
                );
              }

              element.setAttribute("src", originalSrc);
              element.removeAttribute("data-ds-deferred-src");
              element.removeAttribute(
                "data-ds-deferred-srcset",
              );

              element.addEventListener(
                "load",
                () => restoreLayout(element),
                { once: true },
              );
            }
          }

          if (element instanceof HTMLIFrameElement) {
            const originalSrc =
              element.dataset.dsDeferredFrameSrc;

            if (originalSrc) {
              element.setAttribute("src", originalSrc);
              element.removeAttribute(
                "data-ds-deferred-frame-src",
              );
              restoreLayout(element);
            }
          }

          observer.unobserve(element);
        }
      },
      {
        // 사용자가 자료 영역에 도착하기 전에 미리 로드합니다.
        rootMargin: "650px 0px",
        threshold: 0.01,
      },
    );

    function prepareImage(img) {
      if (
        !(img instanceof HTMLImageElement) ||
        img.dataset.dsLazyPrepared === "1"
      ) {
        return;
      }

      img.dataset.dsLazyPrepared = "1";
      img.loading = "lazy";
      img.decoding = "async";

      try {
        img.fetchPriority = "low";
      } catch {
        // 일부 구형 브라우저에서는 fetchPriority가 없습니다.
      }

      if (!isResourceImage(img)) {
        return;
      }

      const rect = img.getBoundingClientRect();

      // 화면에 이미 보이는 자료는 즉시 표시합니다.
      if (rect.top <= viewportHeight * 0.9) {
        return;
      }

      // 이미 캐시되어 로드가 끝난 이미지는 굳이 다시 지연시키지 않습니다.
      if (img.complete && img.naturalWidth > 0) {
        return;
      }

      const src = img.getAttribute("src");

      if (!src || src.startsWith("data:")) {
        return;
      }

      rememberLayout(img);

      img.dataset.dsDeferredSrc = src;

      const srcset = img.getAttribute("srcset");
      if (srcset) {
        img.dataset.dsDeferredSrcset = srcset;
        img.removeAttribute("srcset");
      }

      // 진행 중인 큰 이미지 요청을 중지하고, 가까이 왔을 때 다시 시작합니다.
      img.setAttribute("src", TRANSPARENT_PIXEL);
      observer.observe(img);
    }

    function prepareFrame(frame) {
      if (
        !(frame instanceof HTMLIFrameElement) ||
        frame.dataset.dsLazyPrepared === "1"
      ) {
        return;
      }

      frame.dataset.dsLazyPrepared = "1";
      frame.loading = "lazy";

      const src = frame.getAttribute("src") || "";
      const lower = src.toLowerCase();

      if (
        !src ||
        !(
          lower.includes("supabase") ||
          lower.includes("storage") ||
          lower.includes("pdf")
        )
      ) {
        return;
      }

      const rect = frame.getBoundingClientRect();

      if (rect.top <= viewportHeight * 0.9) {
        return;
      }

      rememberLayout(frame);
      frame.dataset.dsDeferredFrameSrc = src;
      frame.setAttribute("src", "about:blank");
      observer.observe(frame);
    }

    function scan(root = document) {
      root
        .querySelectorAll?.("img")
        .forEach(prepareImage);

      root
        .querySelectorAll?.("iframe")
        .forEach(prepareFrame);
    }

    // React hydration 직후 현재 자료들을 처리합니다.
    scan();

    // 늦게 렌더링되는 가사지/활동자료도 같은 규칙을 적용합니다.
    const mutationObserver = new MutationObserver(
      (mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) {
              continue;
            }

            if (node.matches("img")) {
              prepareImage(node);
            } else if (node.matches("iframe")) {
              prepareFrame(node);
            }

            scan(node);
          }
        }
      },
    );

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
