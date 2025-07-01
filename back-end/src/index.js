const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { syncDatabase } = require("./config/database");
const { connectMongo } = require("./config/mongo");
const mainRoutes = require("./routes/mainRoutes");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
dotenv.config();

const app = express();

const swaggerDocument = YAML.load("swagger.yaml"); // Go up one directory

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// API routes
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    swaggerOptions: {
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
    },
  })
);
app.use("/api", mainRoutes);

// Simple test route
app.get("/", (req, res) => {
  res.json({
    message: "Tomorrow's Money API",
    version: "1.0.0",
    documentation: "/api-docs",
  });
});

const start = async () => {
  try {
    await syncDatabase();
    await connectMongo();

    const PORT = process.env.PORT;
    app.listen(PORT);
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  } catch (err) {
    console.error("❌ Erro ao iniciar o servidor:", err);
  }
};

start();
