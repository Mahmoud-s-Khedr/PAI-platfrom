export type YouTubePlayerErrorCode = 2 | 5 | 100 | 101 | 150 | 153;

interface Player {
  destroy: () => void;
}

interface PlayerConstructor {
  new (target: HTMLElement, options: {
    videoId: string;
    host: string;
    width: string | number;
    height: string | number;
    playerVars: Record<string, string | number>;
    events: { onReady?: () => void; onError?: (event: { data: YouTubePlayerErrorCode }) => void };
  }): Player;
}

interface YouTubeNamespace { Player: PlayerConstructor }

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let playerApiPromise: Promise<YouTubeNamespace> | null = null;

/** Load YouTube's documented IFrame Player API once, only when a lesson needs it. */
export function loadYouTubePlayerApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube player requires a browser"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (playerApiPromise) return playerApiPromise;
  playerApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube Player API did not initialize"));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-pai-youtube-player-api="true"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.paiYoutubePlayerApi = "true";
    script.onerror = () => reject(new Error("YouTube Player API could not be loaded"));
    document.head.appendChild(script);
  });
  return playerApiPromise;
}

export function youtubeErrorMessage(code: YouTubePlayerErrorCode, language: "ar" | "en") {
  const messages = {
    unavailable: language === "ar" ? "تمت إزالة الفيديو أو أصبح خاصًا أو لا يسمح بالتشغيل داخل المنصة." : "This video was removed, made private, or cannot play in an embedded player.",
    technical: language === "ar" ? "تعذّر على مشغّل YouTube تشغيل هذا الفيديو." : "The YouTube player could not play this video.",
    referer: language === "ar" ? "حظر YouTube تشغيل الفيديو لأن المتصفح لم يرسل معلومات الموقع المطلوبة." : "YouTube blocked playback because the browser did not send the required site information.",
  };
  if (code === 100 || code === 101 || code === 150) return messages.unavailable;
  if (code === 153) return messages.referer;
  return messages.technical;
}
