import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB as string,
  process.env.POSTGRES_USER as string,
  process.env.POSTGRES_PASSWORD as string,
  {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    port: Number(process.env.POSTGRES_PORT),
    logging: false,
  }
);
