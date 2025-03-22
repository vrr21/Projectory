// back/routes/authRouter.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../controller/db"); // Подключение к базе данных
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// Регистрация пользователя
router.post("/register", async (req, res) => {
  const { fullName, phone, email, password } = req.body;

  try {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await db.query("SELECT * FROM Users WHERE Email = @email", { email });
    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Создаём сотрудника
    const employeeResult = await db.query(
      "INSERT INTO Employee (FullName, Email, Phone, PositionID) OUTPUT INSERTED.EmployeeID VALUES (@fullName, @email, @phone, NULL)",
      { fullName, email, phone }
    );
    const employeeId = employeeResult.recordset[0].EmployeeID;

    // Создаём пользователя (по умолчанию роль "Сотрудник", не администратор)
    await db.query(
      "INSERT INTO Users (EmployeeID, Email, Password, IsAdmin, Role) VALUES (@employeeId, @email, @password, 0, 'Сотрудник')",
      { employeeId, email, password: hashedPassword }
    );

    res.status(201).json({ message: "Регистрация успешна" });
  } catch (err) {
    console.error("Ошибка регистрации:", err);
    res.status(500).json({ error: "Ошибка регистрации", details: err.message });
  }
});

// Авторизация пользователя
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Проверяем, существует ли пользователь
    const userResult = await db.query("SELECT * FROM Users WHERE Email = @email", { email });
    if (userResult.recordset.length === 0) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    const user = userResult.recordset[0];

    // Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    // Создаём JWT-токен
    const token = jwt.sign(
      { employeeId: user.EmployeeID, role: user.Role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, role: user.Role });
  } catch (err) {
    console.error("Ошибка авторизации:", err);
    res.status(500).json({ error: "Ошибка авторизации", details: err.message });
  }
});

// Проверка токена
router.get("/verify-token", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Токен отсутствует" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, role: decoded.role });
  } catch (err) {
    res.status(401).json({ error: "Недействительный токен" });
  }
});

module.exports = router;