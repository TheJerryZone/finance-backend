const userService = require("../services/userService");

async function listUsers(req, res) {
  try {
    const { page, limit, role, status } = req.query;
    const result = userService.listUsers({
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      role,
      status,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getUser(req, res) {
  try {
    const user = userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createUser(req, res) {
  try {
    const user = userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function updateUser(req, res) {
  try {
    // Non-admin users can only update themselves
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "You can only update your own profile." });
    }
    // Only admins can change roles
    if (req.user.role !== "admin" && req.body.role) {
      return res.status(403).json({ error: "Only admins can change user roles." });
    }
    const user = userService.updateUser(req.params.id, req.body);
    return res.status(200).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "You cannot deactivate your own account." });
    }
    const result = userService.deleteUser(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
