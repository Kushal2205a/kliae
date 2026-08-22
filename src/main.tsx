import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "katex/dist/katex.min.css";
import "./index.css";
import App from "./App";

// The webview runs under XWayland where GTK can't see the compositor scale,
// so the Rust side applies set_zoom(scale) instead. Stroke-based icon SVGs
// (lucide, default 2px) then rasterize heavier than their pre-zoom look.
// Compensate by dividing the stroke width by the effective DPR, landing each
// stroke on the same device-pixel weight as an unscaled render.
const dpr = window.devicePixelRatio || 1;
document.documentElement.style.setProperty(
  "--icon-stroke-width",
  `${Math.max(1, 2 / dpr)}px`,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
