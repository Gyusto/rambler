export interface ThemeDef {
  id: string;
  name: string;
  dots: [string, string];
}

export const DEFAULT_THEME = "twilight";

export const THEMES: ThemeDef[] = [
  { id: "twilight", name: "Twilight", dots: ["#ff8a5b", "#7c5cff"] },
  { id: "midnight", name: "Midnight", dots: ["#38bdf8", "#6366f1"] },
  { id: "ember", name: "Ember", dots: ["#ff7043", "#ff5252"] },
  { id: "grove", name: "Grove", dots: ["#34d399", "#a3e635"] },
  { id: "rose", name: "Rosé", dots: ["#f472b6", "#fb7185"] },
  { id: "daylight", name: "Daylight", dots: ["#f97316", "#7c5cff"] },
];
