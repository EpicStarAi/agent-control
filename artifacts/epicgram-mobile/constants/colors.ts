/**
 * EPICGRAM brand design tokens — derived from epicgram-web/src/index.css.
 * The web artifact uses a single dark theme (no light/dark toggle), so we
 * mirror that single palette here as the `light` (default) key.
 *
 * HSL → hex conversions from index.css :root block.
 */

const colors = {
  light: {
    // Core surfaces
    background: "#0d0816",      // hsl(260 45% 6%)
    foreground: "#e6e8f0",      // hsl(230 20% 92%)

    // Cards / elevated surfaces
    card: "#110e1e",            // hsl(260 35% 9%)
    cardForeground: "#e6e8f0",

    // Primary action color — hot pink
    primary: "#e92fa4",         // hsl(322 81% 55%)
    primaryForeground: "#f5f6fb",

    // Secondary surfaces
    secondary: "#201c34",       // hsl(260 20% 16%)
    secondaryForeground: "#e6e8f0",

    // Muted elements
    muted: "#1c1928",           // hsl(260 20% 14%)
    mutedForeground: "#8e9ab0", // hsl(230 10% 60%)

    // Accent — sky blue / cyan
    accent: "#3ebaf4",          // hsl(199 89% 60%)
    accentForeground: "#f5f6fb",

    // Destructive
    destructive: "#d92626",     // hsl(0 72% 51%)
    destructiveForeground: "#f5f6fb",

    // Borders and inputs
    border: "#28233d",          // hsl(260 20% 20%)
    input: "#201c34",

    // Legacy aliases
    text: "#e6e8f0",
    tint: "#3ebaf4",
  },

  radius: 8,
};

export default colors;
