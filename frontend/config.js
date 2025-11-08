const isLocal = /^localhost$|^127\.\d+\.\d+\.\d+$/.test(
  window.location.hostname
);

export const BASE_URL = isLocal
  ? "http://localhost:5000/api"
  : "https://spaces.onrender.com/api";

export const SOCKET_URL = isLocal
  ? "http://localhost:5000"
  : "https://spaces.onrender.com";
