import { createRoot } from "react-dom/client";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";
import { pwaService } from "./services/pwa";
import { socketService } from "./services/socket";

// Custom theme with modern font
const theme = extendTheme({
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  },
  colors: {
    brand: {
      50: '#fff5e6',
      100: '#ffe0b3',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: '#FB8B24',
      600: '#f57c00',
      700: '#ef6c00',
      800: '#e65100',
      900: '#bf360c',
    },
    accent: {
      50: '#fdf2e9',
      100: '#f9dcc4',
      200: '#f4c69f',
      300: '#efb07a',
      400: '#ea9a55',
      500: '#DDAA52',
      600: '#d4941a',
      700: '#b8820e',
      800: '#9c6f02',
      900: '#805d00',
    }
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
});

// Initialize PWA
pwaService.register();

// Initialize WebSocket
socketService.connect();

const rootElement = document.getElementById("root")!;

if (window.location.pathname.startsWith('/admin')) {
  // Render standalone admin app — no auth interference from main app
  import('./AdminApp').then(({ default: AdminApp }) => {
    createRoot(rootElement).render(
      <ChakraProvider theme={theme}>
        <AdminApp />
        <Toaster position="top-right" />
      </ChakraProvider>
    );
  });
} else {
  createRoot(rootElement).render(
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  );
}