const express = require("express");
const mssql = require("mssql");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(express.json());

// Конфигурация подключения к базе данных
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: "KURSACHBD",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Функция подключения к базе данных
async function startDB() {
  try {
    await mssql.connect(dbConfig);
    console.log("База данных подключена");
  } catch (err) {
    console.error("Ошибка подключения к БД:", err);
  }
}

startDB();

// Маршрут регистрации
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Проверка, существует ли пользователь с таким email
    const pool = await mssql.connect(dbConfig);
    const checkUser = await pool
      .request()
      .input("email", mssql.NVarChar, email)
      .query("SELECT * FROM Employee WHERE Email = @email");

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Хеширование пароля
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Вставка нового сотрудника в таблицу Employee
    const employeeResult = await pool
      .request()
      .input("FullName", mssql.NVarChar, "Новый пользователь") // Можно добавить поле для имени в форму
      .input("Email", mssql.NVarChar, email)
      .input("Phone", mssql.NVarChar, null)
      .input("PositionID", mssql.Int, null)
      .query(
        "INSERT INTO Employee (FullName, Email, Phone, PositionID) OUTPUT INSERTED.EmployeeID VALUES (@FullName, @Email, @Phone, @PositionID)"
      );

    const employeeId = employeeResult.recordset[0].EmployeeID;

    // Вставка пользователя в таблицу User
    const username = email.split("@")[0]; // Например, берем часть email до @
    await pool
      .request()
      .input("EmployeeID", mssql.Int, employeeId)
      .input("Username", mssql.NVarChar, username)
      .input("PasswordHash", mssql.NVarChar, passwordHash)
      .input("Role", mssql.NVarChar, "Сотрудник")
      .query(
        "INSERT INTO [User] (EmployeeID, Username, PasswordHash, Role) VALUES (@EmployeeID, @Username, @PasswordHash, @Role)"
      );

    // Здесь можно сгенерировать токен (например, JWT), но для простоты вернем успех
    res.status(201).json({ token: "fake-token", message: "Регистрация успешна" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});