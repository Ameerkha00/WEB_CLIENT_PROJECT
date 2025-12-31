const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const USERS_FILE = path.join(__dirname, "data", "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// REGISTER
router.post("/register", (req, res) => {
  const { username, password, firstName, imageUrl } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: "Username already exists" });
  }

  const user = { username, password, firstName, imageUrl };
  users.push(user);
  saveUsers(users);

  res.json({ message: "User created" });
});

// LOGIN
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json(user);
});

module.exports = router;
