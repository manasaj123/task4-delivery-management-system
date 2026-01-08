
// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"], // 👈 IMPORTANT
  withCredentials: true,
});

export default socket;
