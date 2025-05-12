
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { UserProvider } from "./context/UserContextApi.jsx";
import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for simple-peer
window.global = window;
window.process = process;
window.Buffer = Buffer;

// Additional polyfills
window.util = {
  debuglog: () => {},
  inspect: (obj) => JSON.stringify(obj, null, 2)
};

createRoot(document.getElementById("root")).render(
  <UserProvider>
    <App />
  </UserProvider>
);
