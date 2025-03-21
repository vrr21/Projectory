const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");
const authRouter = require("./authRouter");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.send("🚀 Сервер работает!");
});

app.use((req, res, next) => {
  console.log(`Получен запрос: ${req.method} ${req.url}`);
  next();
});

sequelize
  .sync({ force: false })
  .then(() => console.log("✅ База данных синхронизирована"))
  .catch((err) => console.error("❌ Ошибка синхронизации базы данных:", err));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));