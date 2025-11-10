require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// -------------------------
// Socket.io setup
// -------------------------
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io); // make io globally available

// -------------------------
// Middlewares
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://127.0.0.1:5501",
  "http://localhost:5500",
  "https://spaces-self-seven.vercel.app",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("CORS not allowed from this origin"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// -------------------------
// Serve uploads
// -------------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------------
// Root test routes
// -------------------------
app.get("/", (req, res) => res.json({ message: "Spaces backend running!" }));

// -------------------------
// API routes
// -------------------------
app.use("/api", require("./router/api"));

// -------------------------
// 404 handler
// -------------------------
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// -------------------------
// Global error handler
// -------------------------
app.use(errorHandler);

// -------------------------
// Example Socket.io logic
// -------------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", ({ room_code, user_id }) => {
    socket.join(room_code);
    console.log(`User ${user_id} joined room ${room_code}`);
    socket.to(room_code).emit("user_joined", { user_id });
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
