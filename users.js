// ============================================================
// users.js — Hardcoded user list
// Admin edits this file directly to add/remove users.
// Re-upload to GitHub after changes.
// ============================================================

const USERS = [
  { username: "nandakumar", password: "nandu123", name: "Nandakumar M", role: "admin", active: true },
  { username: "selvakumar", password: "selva123", name: "Selvakumar", role: "user", active: true },
  { username: "karthik",    password: "kart123",  name: "Karthik",    role: "user", active: true },
  { username: "demo",       password: "demo123",  name: "Demo User",  role: "user", active: false },
];

// Admin credentials (separate from USERS list)
const ADMIN_CREDS = { username: "admin", password: "666666" };

// ============================================================
// HOW TO ADD A USER:
//   { username: "newuser", password: "pass123", name: "Full Name", role: "user", active: true },
// HOW TO DEACTIVATE: set active: false
// HOW TO REMOVE: delete the line
// ============================================================
