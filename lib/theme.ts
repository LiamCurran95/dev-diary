export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "dev-diary.theme";

/**
 * Runs inline in <head> before first paint, so a stored choice applies without
 * a flash of the system theme. Kept as a string because it executes before
 * React hydrates.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
