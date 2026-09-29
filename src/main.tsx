import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/space-grotesk/latin-300.css";
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "@fontsource/doto/latin-700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/glass.css";
import "./styles/components.css";
import "./styles/widgets.css";
import "./styles/app.css";
import { App } from "./App";
import { isTauri } from "./lib/bridge";
import { initAppearance } from "./lib/theme";

initAppearance(isTauri() ? "tauri" : "web");

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
