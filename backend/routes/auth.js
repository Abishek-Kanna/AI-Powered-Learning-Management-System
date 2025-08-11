const express = require('express');
const router = express.Router();
const { AuthManager } = require('../auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const { userId, token } = await AuthManager.registerUser(username, email, password, role);
    res.status(201).json({ success: true, userId, token });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { userId, token, role } = await AuthManager.loginUser(username, password);
    res.json({ success: true, userId, token, role });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = router;