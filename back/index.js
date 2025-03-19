const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models"); // Импортируем sequelize из models
const authRouter = require("./authRouter"); // Импортируем маршруты

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000" })); // Разрешаем запросы с фронтенда
app.use(express.json());

// Подключаем маршруты
app.use("/api/auth", authRouter);

// Проверка работы сервера
app.get("/", (req, res) => {
  res.send("🚀 Сервер работает!");
});

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`Получен запрос: ${req.method} ${req.url}`);
  next();
});

// Синхронизация с базой данных
sequelize
  .sync({ force: false }) // force: false, чтобы не пересоздавать таблицы
  .then(() => console.log("✅ База данных синхронизирована"))
  .catch((err) => console.error("❌ Ошибка синхронизации базы данных:", err));

// Запуск сервера
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));