require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER || "ProssLibrann",
    password: process.env.DB_PASSWORD || "123456789",
    database: process.env.DB_NAME || "KURSACHBD",
    host: process.env.DB_HOST || "DESKTOP-RG4PTI5\\SQLEXPRESS",
    port: process.env.DB_PORT || 1433,
    dialect: "mssql",
    dialectOptions: {
      options: {
        encrypt: false, // Отключить шифрование, если нет SSL
        enableArithAbort: true,
        trustServerCertificate: true,
      },
    },
    logging: false, // Отключение логов Sequelize
  },
};
