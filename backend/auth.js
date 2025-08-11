const jwt = require('jsonwebtoken');
const User = require('./models/user.js');

class AuthManager {
  static async registerUser(username, email, password, role = 'student') {
    // ... your registerUser function is correct and does not need changes
    try {
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        throw new Error('Username or email already exists');
      }
      const user = new User({ username, email, password, role });
      await user.save();
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return { userId: user._id, token };
    } catch (error) {
      throw error;
    }
  }

  static async loginUser(username, password) {
    try {
      // Find user AND explicitly select the password field
      const user = await User.findOne({ username }).select('+password'); // <-- THIS IS THE FIX

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return { userId: user._id, token, role: user.role };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = { AuthManager };