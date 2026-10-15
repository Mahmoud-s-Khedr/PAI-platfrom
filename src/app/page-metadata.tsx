import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Language } from "../lib/types";

const platformName = "PAI Education";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Keeps browser titles and client-rendered share metadata in sync with a route. */
export function PageMetadata({ title, description, language, noIndex = false }: { title?: string; description: string; language: Language; noIndex?: boolean }) {
  const location = useLocation();
  useEffect(() => {
    const pageTitle = title ? `${title} | ${platformName}` : platformName;
    document.title = pageTitle;
    setMeta("name", "description", description);
    setMeta("name", "robots", noIndex ? "noindex,follow" : "index,follow");
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:locale", language === "ar" ? "ar_EG" : "en_US");
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", window.location.href);
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", description);
  }, [description, language, noIndex, title, location.pathname]);
  return null;
}
