import type { TextStyle } from "react-native";

/* ══════════════════════════════════════════════════════════════════
   THE FIDATO LOOK ON A PHONE — the tokens of src/styles/theme.css and the
   Type Ladder of the fidato-design skill (the owner's D22-47 to D22-51).
   theme.css wins if the two ever differ: copy, do not eyeball.
   ══════════════════════════════════════════════════════════════════ */

export const c = {
  white: "#ffffff",
  ink900: "#031728",
  grey700: "#354552",
  grey600: "#4c5b67",
  grey500: "#67737e",
  grey300: "#ccd0d4",
  grey200: "#e2e5e8",
  grey100: "#eef0f2",
  grey50: "#f7f8f9",
  orange: "#df6128",
  orange600: "#c4521d",
  orange700: "#a34314",
  orange100: "#f9dccd",
  orange50: "#fdf1eb",
  yellow800: "#8a6300",
  yellow100: "#ffedbf",
  yellow50: "#fff8e6",
  success600: "#1a5f4f",
  red700: "#c52a1a",
  red100: "#f9d0cc",
  red50: "#fdeceb",
  info: "#2b6cb0",
  info100: "#d2e2f2",
  info50: "#ebf2f9",
  /** Labels on navy: white at 72%. */
  onNavy: "rgba(255,255,255,0.72)",
  /** The gauge's track on navy: white at 12%. */
  navyTrack: "rgba(255,255,255,0.12)",
};

/** The Rhythm Rule's steps, phone. */
export const space = { side: 20, section: 20, card: 12, tile: 8, cardX: 16, cardY: 14 };

const tab: TextStyle = { fontVariant: ["tabular-nums"] };

/** Inter, by weight (M-4; loaded in app/_layout.tsx). A phone picks a font
    file by its name, so a weight is a face: never `fontWeight` with it
    (Android would fake a bold on top of the SemiBold). */
export const face = {
  500: { fontFamily: "Inter_500Medium" },
  600: { fontFamily: "Inter_600SemiBold" },
  700: { fontFamily: "Inter_700Bold" },
} satisfies Record<number, TextStyle>;

/** The Type Ladder: one size per role, no sizes in between. */
export const t = {
  title: { fontSize: 26, ...face[700], letterSpacing: -0.57, color: c.ink900 },
  lead: { fontSize: 30, ...face[600], letterSpacing: -0.9, ...tab },
  figure: { fontSize: 20, ...face[600], letterSpacing: -0.4, color: c.ink900, ...tab },
  heading: { fontSize: 16, ...face[600], color: c.ink900 },
  label: { fontSize: 14, ...face[500], color: c.grey600 },
  caption: { fontSize: 12, ...face[500], color: c.grey500 },
  /** The date above the title: 12px, 600, capitals. */
  eyebrow: { fontSize: 12, ...face[600], letterSpacing: 0.36, textTransform: "uppercase", color: c.grey500 },
  tab,
} satisfies Record<string, TextStyle>;
