import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { pwaService } from "./services/pwa";
import { socketService } from "./services/socket";

// Initialize PWA
pwaService.register();

// Initialize WebSocket
socketService.connect();

createRoot(document.getElementById("root")!).render(<App />);