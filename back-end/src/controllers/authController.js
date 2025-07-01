const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

const register = async (req, res) => {
  const { email, password, name, type } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({
      message: "Email, password, and name are required",
    });
  }
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Email já está em uso" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      type,
    });
    return res.status(201).json({ id: newUser.id, email: newUser.email });
  } catch (err) {
    return res.status(500).json({ message: "Erro no registro", error: err });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "Email inválido" });
    if (!user.password) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Senha Invalida" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
      algorithm: "HS256",
    });

    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ message: "Erro no login", error: err });
  }
};

module.exports = { register, login };
