import { createRoot } from "react-dom/client";
import "@learning-platform/core/theme.css";
import "../css/main.css";
import "../css/components.css";
import "../css/utilities.css";
import "../css/activities.css";
import "../css/hub.css";
import "./theme-bootstrap";
import "./globals";
import { App } from "./App";
import { readPageContext } from "./page-context";

const root = document.getElementById("root");
if (!root) throw new Error("TLEVEL_ROOT_MISSING");

createRoot(root).render(<App context={readPageContext()} />);
