// back/hashPasswords.js
const bcrypt = require("bcryptjs");
const mssql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function hashPasswords() {
  try {
    const pool = await mssql.connect(dbConfig);
    console.log("Подключение к базе данных успешно");

    // Получаем всех пользователей
    const usersResult = await pool.request().query("SELECT UserID, Password FROM Users");
    const users = usersResult.recordset;

    for (const user of users) {
      const userId = user.UserID;
      const plainPassword = user.Password;

      // Хешируем пароль
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      console.log(`Хешируем пароль для UserID ${userId}: ${plainPassword} -> ${hashedPassword}`);

      // Обновляем пароль в базе данных
      await pool
        .request()
        .input("UserID", mssql.Int, userId)
        .input("Password", mssql.NVarChar, hashedPassword)
        .query("UPDATE Users SET Password = @Password WHERE UserID = @UserID");
    }

    console.log("Все пароли успешно хешированы");
    process.exit(0);
  } catch (err) {
    console.error("Ошибка при хешировании паролей:", err.message, err.stack);
    process.exit(1);
  }
}

hashPasswords();