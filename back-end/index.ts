import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sequelize } from './config/sequelize';
import { connectMongo } from './config/mongo';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Teste simples
app.get('/', (_req: Request, res: Response) => {
  res.send('API Online');
});
const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await connectMongo();

    app.listen(process.env.PORT, () => {
      console.log(`Servidor rodando na porta ${process.env.PORT}`);
    });
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
  }
};

start();
