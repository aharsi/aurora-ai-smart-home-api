// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// Routes
const authRoute = require("./routes/auth");
const devicesRoute = require("./routes/devices");
const usersRoute = require("./routes/users");
const modulesRoute = require("./routes/modules");
const arduinoRoute = require("./routes/arduino"); // For Arduino master/slaves

// WebSocket service
const { initSocket, updateDevice } = require("./services/socket");

const app = express();
const server = http.createServer(app);

// ===== Middleware =====
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: "Too many requests, try again later."
});
app.use(limiter);

// ===== JWT verification middleware =====
function verifyJWT(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET || "dev", (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// ===== HMAC verification middleware for devices =====
function verifyHMAC(req, res, next) {
  const { deviceId, payload, hmac } = req.body;
  if (!deviceId || !payload || !hmac) return res.status(400).json({ error: "Missing fields" });

  const secrets = JSON.parse(process.env.DEVICE_SECRETS || "{}");
  const secret = secrets[deviceId];
  if (!secret) return res.status(401).json({ error: "Unknown device" });

  const computed = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  if (computed !== hmac) return res.status(401).json({ error: "Invalid signature" });

  next();
}

// ===== Routes =====
app.use("/auth", authRoute);               // Web client auth
app.use("/devices", devicesRoute);         // Device endpoints (frontend & Arduino)
app.use("/users", verifyJWT, usersRoute);  // Users management (admin)
app.use("/modules", verifyJWT, modulesRoute); // All modules (Door, Curtain, Light, Energy, Security, Gaming)
app.use("/arduino", arduinoRoute);         // Arduino master/slaves communication

// ===== WebSocket initialization =====
initSocket(server);

// ===== Device update endpoint from Arduino/ESP32 =====
app.post("/api/device/update", verifyHMAC, (req, res) => {
  const device = req.body;
  updateDevice(device); // Broadcast to all connected clients
  res.status(200).json({ message: "Device updated successfully" });
});

// ===== Health check =====
app.get("/", (req, res) => res.json({ message: "Aurora Smart Home API Running" }));

// ===== Start server =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = { app, server };