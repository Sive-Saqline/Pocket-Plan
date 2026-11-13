export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "pocketplan.theme";

/** Runs in <head> before first paint so the saved theme never flashes (EXPERIENCE.md §6.6). */
export const themeBootstrap = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** Applies the theme now and remembers it on this device for the next first paint. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this page
  }
}
