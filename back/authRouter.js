const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("./models");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here_change_me";

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Получен запрос на регистрацию:", { email, password });

    if (!email || !password) {
      console.log("Ошибка: Email и пароль обязательны");
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    if (!email.endsWith("@gmail.com")) {
      console.log("Ошибка: Разрешены только адреса @gmail.com");
      return res.status(400).json({ error: "Разрешены только адреса @gmail.com" });
    }

    const username = email.split("@")[0];
    console.log("Проверка существующего пользователя...");
    const existingUserByEmail = await User.findOne({ where: { Email: email } });
    const existingUserByUsername = await User.findOne({ where: { Username: username } });
    if (existingUserByEmail) {
      console.log("Ошибка: Пользователь с таким email уже зарегистрирован");
      return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
    }
    if (existingUserByUsername) {
      console.log("Ошибка: Пользователь с таким username уже зарегистрирован");
      return res.status(400).json({ error: "Пользователь с таким username уже зарегистрирован" });
    }

    console.log("Проверка длины пароля...");
    if (password.length < 6) {
      console.log("Ошибка: Пароль должен содержать минимум 6 символов");
      return res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
    }

    console.log("Хеширование пароля...");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("Создание нового пользователя...");
    const newUser = await User.create({
      Username: username,
      Email: email,
      PasswordHash: hashedPassword,
      Role: "Сотрудник",
      IsAdmin: false,
      EmployeeID: null,
    });

    console.log("Генерация JWT-токена...");
    const token = jwt.sign(
      { id: newUser.UserID, email: newUser.Email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("Регистрация успешна:", { id: newUser.UserID, email: newUser.Email });
    return res.status(201).json({
      message: "Регистрация успешна",
      token,
      user: { id: newUser.UserID, email: newUser.Email },
    });
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    const user = await User.findOne({ where: { Email: email } });
    if (!user) {
      return res.status(400).json({ error: "Пользователь с таким email не найден" });
    }

    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Неверный пароль" });
    }

    const token = jwt.sign(
      { id: user.UserID, email: user.Email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Авторизация успешна",
      token,
      user: { id: user.UserID, email: user.Email },
    });
  } catch (error) {
    console.error("Ошибка при авторизации:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;