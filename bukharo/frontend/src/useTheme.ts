import { useEffect, useState } from "react";
import { THEMES, applyTheme, getStoredTheme } from "./theme";

export function useTheme() {
  const [themeId, setThemeId] = useState(() => getStoredTheme().id);

  useEffect(() => {
    const t = THEMES.find(x => x.id === themeId) ?? THEMES[0];
    applyTheme(t);
    localStorage.setItem("bukharo-theme", t.id);
  }, [themeId]);

  return { themeId, setThemeId };
}
