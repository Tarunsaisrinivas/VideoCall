// First, let's improve your socketInstance.js file
import { io } from "socket.io-client";

let socket;

const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    // Add event listeners for connection status
    socket.on("connect", () => {
      console.log("Socket connected successfully");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
  }
  return socket;
};

const setSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  socket = null;
};

export default {
  getSocket,
  setSocket,
};
