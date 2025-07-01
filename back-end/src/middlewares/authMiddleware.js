const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: "Token não fornecido" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details including type
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    req.user = {
      id: decoded.id,
      type: user.type, // Add user type to request
    };
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
};

module.exports = { authenticate };
