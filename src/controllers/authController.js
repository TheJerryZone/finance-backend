const { login } = require("../services/authService");

async function loginHandler(req, res) {
  try {
    const { email, password } = req.body;
    const result = login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

async function meHandler(req, res) {
  const { getUserById } = require("../services/userService");
  try {
    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { loginHandler, meHandler };
