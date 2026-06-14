let arabicFontRequested = false;

export function ensureArabicFont() {
  if (arabicFontRequested || typeof document === "undefined") return;
  arabicFontRequested = true;

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.gstatic.com";
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=optional";
  document.head.appendChild(stylesheet);
}
