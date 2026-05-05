const express = require("express");
const router = express.Router();

// Temporary in-memory store until Azure PostgreSQL is ready
let invites = [];
let nextId = 1;

// POST /invites — save a pending invite

router.post("/", async (req, res) => {
  const { email, name, role, group_id } = req.body;

  // Validation
  if (!email || typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ error: "Email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Name is required" });
  }

  const validRoles = ["member", "treasurer", "admin"];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: "Role must be member, treasurer or admin" });
  }

  // Check for duplicate invite
  const existing = invites.find(i => i.email === email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An invite has already been sent to this email" });
  }

  const invite = {
    id: nextId++,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    group_id: group_id || null,
    status: "pending",
    created_at: new Date().toISOString()
  };

  invites.push(invite);
  res.status(201).json(invite);
});

// GET /invites — list all pending invites
router.get("/", async (req, res) => {
  res.json(invites);
});

// DELETE /invites/:id — cancel an invite
router.delete("/:id", async (req, res) => {
  const index = invites.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Invite not found" });

  invites.splice(index, 1);
  res.json({ message: "Invite cancelled successfully" });
});

module.exports = router;