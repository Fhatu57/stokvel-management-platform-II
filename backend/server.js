const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
const groupRoutes = require("./routes/groups");
const inviteRoutes = require("./routes/invites");

app.use("/groups", groupRoutes);
app.use("/invites", inviteRoutes);

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    service: "Stokvel Management Platform",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  return res.status(404).sendFile(path.join(__dirname, "../frontend", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
