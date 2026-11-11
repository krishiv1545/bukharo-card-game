/** All theme tokens. Add new entries here to extend the picker. */
export interface Theme {
  id: string;
  name: string;
  bg: string;        // body background
  panel: string;     // sidebar / header overlay
  scrollThumb: string;
  scrollTrack: string;
  back1: string;     // card-back stripe colour A
  back2: string;     // card-back stripe colour B
}

export const THEMES: Theme[] = [
  {
    id: "forest",   name: "Forest",
    bg: "#2b4a3a",  panel: "#1a3028",
    scrollThumb: "#4a7c5a", scrollTrack: "#1a3028",
    back1: "#1e3a8a", back2: "#2563eb",
  },
  {
    id: "midnight", name: "Midnight",
    bg: "#0f1c2e",  panel: "#081322",
    scrollThumb: "#2a4f7c", scrollTrack: "#081322",
    back1: "#1e3a8a", back2: "#2563eb",
  },
  {
    id: "velvet",   name: "Velvet",
    bg: "#2a1838",  panel: "#1a0d26",
    scrollThumb: "#6b35a0", scrollTrack: "#1a0d26",
    back1: "#4c1d95", back2: "#7c3aed",
  },
  {
    id: "maroon",   name: "Maroon",
    bg: "#2d1414",  panel: "#1e0808",
    scrollThumb: "#7c2020", scrollTrack: "#1e0808",
    back1: "#7f1d1d", back2: "#b91c1c",
  },
  {
    id: "slate",    name: "Slate",
    bg: "#1c2a3c",  panel: "#111e2e",
    scrollThumb: "#3a607c", scrollTrack: "#111e2e",
    back1: "#1e3a8a", back2: "#2563eb",
  },
  {
    id: "walnut",   name: "Walnut",
    bg: "#2a1f10",  panel: "#1a1208",
    scrollThumb: "#7a5020", scrollTrack: "#1a1208",
    back1: "#78350f", back2: "#b45309",
  },
  {
    id: "charcoal", name: "Charcoal",
    bg: "#1c1c1c",  panel: "#111111",
    scrollThumb: "#505050", scrollTrack: "#111111",
    back1: "#1e3a8a", back2: "#2563eb",
  },
  {
    id: "teal",     name: "Deep Teal",
    bg: "#0c2d2d",  panel: "#071e1e",
    scrollThumb: "#1e7a7a", scrollTrack: "#071e1e",
    back1: "#134e4a", back2: "#0f766e",
  },
  {
    id: "sage",     name: "Sage",
    bg: "#1c3022",  panel: "#111f16",
    scrollThumb: "#3c6e48", scrollTrack: "#111f16",
    back1: "#14532d", back2: "#15803d",
  },
  {
    id: "bronze",   name: "Bronze",
    bg: "#2a1c08",  panel: "#1a1004",
    scrollThumb: "#8a5c20", scrollTrack: "#1a1004",
    back1: "#78350f", back2: "#d97706",
  },
  {
    id: "dusk",     name: "Dusk",
    bg: "#201630",  panel: "#140e22",
    scrollThumb: "#5a4080", scrollTrack: "#140e22",
    back1: "#4c1d95", back2: "#6d28d9",
  },
  {
    id: "abyss",    name: "Abyss",
    bg: "#080f18",  panel: "#040810",
    scrollThumb: "#1e3a5a", scrollTrack: "#040810",
    back1: "#1e3a8a", back2: "#1d4ed8",
  },
];

export function applyTheme(t: Theme) {
  const r = document.documentElement;
  r.style.setProperty("--bg",           t.bg);
  r.style.setProperty("--panel",        t.panel);
  r.style.setProperty("--scroll-thumb", t.scrollThumb);
  r.style.setProperty("--scroll-track", t.scrollTrack);
  r.style.setProperty("--back1",        t.back1);
  r.style.setProperty("--back2",        t.back2);
}

export function getStoredTheme(): Theme {
  const id = localStorage.getItem("bukharo-theme") ?? "forest";
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
