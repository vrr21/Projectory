const express = require("express");
const jwt = require("jsonwebtoken");
const { Task, User } = require("./models");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here_change_me";

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("Токен не предоставлен в запросе");
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Неверный токен:", err.message);
      return res.status(403).json({ error: "Неверный токен" });
    }
    req.user = user;
    console.log("Токен успешно проверен, пользователь:", req.user);
    next();
  });
};

// Создание новой задачи
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Название задачи обязательно" });
    }

    const task = await Task.create({
      Title: title,
      Description: description || null,
      DueDate: dueDate || null,
      Status: "To Do",
      CreatedBy: req.user.id, // ID пользователя из токена
    });

    console.log("Задача успешно создана:", task);
    return res.status(201).json({
      message: "Задача успешно создана",
      task,
    });
  } catch (error) {
    console.error("Ошибка при создании задачи:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Получение всех задач пользователя
router.get("/", authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { CreatedBy: req.user.id },
      include: [{ model: User, attributes: ["Username", "Email"] }],
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("Ошибка при получении задач:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;