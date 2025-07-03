const { User } = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { email, password, name, type, viewable_user_id } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({
      message: "Email, password, and name are required",
    });
  }
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate type and viewable_user_id combination
    if (type === 2 && viewable_user_id) {
      const viewableUser = await User.findByPk(viewable_user_id);
      if (!viewableUser) {
        return res.status(400).json({ message: "Viewable user not found" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      type: type || 0,
      viewable_user_id: type === 2 ? viewable_user_id : null,
    });

    // Generate JWT token for auto-login after registration
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return both token and user data (excluding password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type === 0 ? "user" : user.type === 1 ? "admin" : "viewer",
      active: user.active,
      viewable_user_id: user.viewable_user_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.status(201).json({
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return both token and user data (excluding password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type === 0 ? "user" : user.type === 1 ? "admin" : "viewer",
      active: user.active,
      viewable_user_id: user.viewable_user_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.status(200).json({
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login };
