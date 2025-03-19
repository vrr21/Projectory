const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mssql",
    port: process.env.DB_PORT,
    dialectOptions: {
      options: {
        enableArithAbort: true,
        trustServerCertificate: true,
      },
    },
    logging: false,
  }
);

const User = require("./User")(sequelize);

sequelize
  .authenticate()
  .then(() => console.log("✅ Успешное подключение к БД"))
  .catch((err) => console.error("❌ Ошибка подключения к БД:", err));

module.exports = { sequelize, User };