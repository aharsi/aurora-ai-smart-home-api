import express from "express";

const app = express();
app.use(express.json());

let command = {};
let status = {};

// ✅ Allowed commands list
const allowedCommands = {
  DOOR: ["DOOR_OPEN", "DOOR_CLOSE"],
  CURTAIN: ["CURTAIN_OPEN", "CURTAIN_CLOSE", "CURTAIN_STOP"],
  LIVING_ROOM_LED: ["LIVING_ROOM_LED_ON", "LIVING_ROOM_LED_OFF"],
  BEDROOM_LED: ["BEDROOM_LED_ON", "BEDROOM_LED_OFF"],
  BATHROOM_LED: ["BATHROOM_LED_ON", "BATHROOM_LED_OFF"],
  SOLAR_PANEL: ["OUTDOOR_SOLAR_PANEL_ON", "OUTDOOR_SOLAR_PANEL_OFF"],
  CUSTOM: ["CUSTOM_CMD"],
};

// ✅ Root
app.get("/", (req, res) =>
  res.json({ message: "Aurora Smart Home API Running" })
);

// ✅ Receive command from app
app.post("/command", (req, res) => {
  const { device, command: cmd, parameters } = req.body;

  // Basic field check
  if (!device || !cmd) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: device or command",
    });
  }

  // Validate device
  if (!allowedCommands[device]) {
    return res.status(400).json({ success: false, error: "Invalid device" });
  }

  // For non-custom devices, validate command
  if (device !== "CUSTOM" && !allowedCommands[device].includes(cmd)) {
    return res.status(400).json({
      success: false,
      error: `Invalid command '${cmd}' for device '${device}'`,
    });
  }

  // For CUSTOM, ensure parameters exist
  if (device === "CUSTOM" && (!parameters || typeof parameters !== "object")) {
    return res.status(400).json({
      success: false,
      error: "CUSTOM_CMD requires 'parameters' (object)",
    });
  }

  // Save command
  command = { device, command: cmd, parameters: parameters || {} };
  console.log("✅ Received valid command:", command);
  res.json({ success: true, received: command });
});

// ✅ NodeMCU fetches command
app.get("/command", (req, res) => {
  res.json(command);
});

// ✅ NodeMCU updates status
app.post("/status", (req, res) => {
  status = req.body;
  console.log("📡 Status update:", status);
  res.json({ success: true });
});

// ✅ App checks status
app.get("/status", (req, res) => {
  res.json(status);
});

// ✅ Start server
app.listen(3000, () => console.log("🚀 API running on port 3000"));
