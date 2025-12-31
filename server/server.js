const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./auth.routes");
const playlistsRoutes = require("./playlists.routes");

const app = express();
const PORT = 3000;

// middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/playlists", playlistsRoutes);

// serve frontend
app.use(express.static(path.join(__dirname, "../public")));

// Express 5 safe catch-all
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
