const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const BASE = path.join(__dirname, "data");

function userFile(username) {
  return path.join(BASE, `playlists_${username}.json`);
}

router.get("/:username", (req, res) => {
  const file = userFile(req.params.username);
  if (!fs.existsSync(file)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(file)));
});

router.post("/:username", (req, res) => {
  const file = userFile(req.params.username);
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

module.exports = router;
