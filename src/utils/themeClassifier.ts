export type ThemeClassifierFn = (theme: string) => Promise<string | null>;

let registeredClassifier: ThemeClassifierFn | null = null;

export function registerThemeClassifier(fn: ThemeClassifierFn) {
  registeredClassifier = fn;
}

export async function classifyThemeSemantically(theme: string): Promise<string | null> {
  if (!registeredClassifier) {
    return null;
  }
  try {
    return await registeredClassifier(theme);
  } catch (error) {
    console.warn("[classifyThemeSemantically] Gagal mengklasifikasikan tema secara semantik:", error);
    return null;
  }
}
