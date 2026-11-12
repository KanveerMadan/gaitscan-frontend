// One look for every chart (Recharts): mono figures, the theme's muted ink for axes, the border colour
// for the grid, and tooltips that look like the app's cards. Colours come from the CSS tokens, so
// light and dark mode both work.
export const AXIS = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" },
  stroke: "var(--border)",
  tickLine: false,
};
export const GRID = { strokeDasharray: "3 3", stroke: "var(--border)", vertical: false };
export const TOOLTIP = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--foreground)",
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 2 },
  cursor: { stroke: "var(--border)" },
};
export const LEGEND = { wrapperStyle: { fontSize: 12, color: "var(--muted-foreground)" } };
export const SERIES = ["var(--chart-1)", "var(--chart-2)"];
