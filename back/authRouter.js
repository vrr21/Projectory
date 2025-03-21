const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sequelize } = require("./models");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here_change_me";

// Модель Employee
const Employee = sequelize.define(
  "Employee",
  {
    EmployeeID: {
      type: require("sequelize").DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    FullName: {
      type: require("sequelize").DataTypes.STRING(255),
      allowNull: false,
    },
    Email: {
      type: require("sequelize").DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    Phone: {
      type: require("sequelize").DataTypes.STRING(15),
      allowNull: true,
    },
    PositionID: {
      type: require("sequelize").DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "Employee",
    timestamps: false,
  }
);

// Модель User
const User = require("./models/User")(sequelize);

// Устанавливаем связь
User.belongsTo(Employee, { foreignKey: "EmployeeID" });

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Ожидаем формат "Bearer <token>"

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

router.post("/register", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { email, password } = req.body;
    console.log("Получен запрос на регистрацию:", { email, password });

    if (!email || !password) {
      console.log("Ошибка: Email и пароль обязательны");
      await transaction.rollback();
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    if (!email.endsWith("@gmail.com")) {
      console.log("Ошибка: Разрешены только адреса @gmail.com");
      await transaction.rollback();
      return res.status(400).json({ error: "Разрешены только адреса @gmail.com" });
    }

    const username = email.split("@")[0];
    console.log("Проверка существующего пользователя...");
    const existingUserByEmail = await User.findOne({ where: { Email: email } });
    const existingUserByUsername = await User.findOne({ where: { Username: username } });
    const existingEmployee = await Employee.findOne({ where: { Email: email } });

    if (existingUserByEmail || existingEmployee) {
      console.log("Ошибка: Пользователь с таким email уже зарегистрирован");
      await transaction.rollback();
      return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
    }
    if (existingUserByUsername) {
      console.log("Ошибка: Пользователь с таким username уже зарегистрирован");
      await transaction.rollback();
      return res.status(400).json({ error: "Пользователь с таким username уже зарегистрирован" });
    }

    console.log("Проверка длины пароля...");
    if (password.length < 6) {
      console.log("Ошибка: Пароль должен содержать минимум 6 символов");
      await transaction.rollback();
      return res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
    }

    console.log("Хеширование пароля...");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("Создание записи в Employee...");
    const newEmployee = await Employee.create(
      {
        FullName: username, // Можно добавить поле для имени в форму
        Email: email,
        Phone: null,
        PositionID: null,
      },
      { transaction }
    );

    console.log("Создание нового пользователя...");
    const newUser = await User.create(
      {
        Username: username,
        Email: email,
        PasswordHash: hashedPassword,
        Role: "Сотрудник",
        IsAdmin: false,
        EmployeeID: newEmployee.EmployeeID,
      },
      { transaction }
    );

    console.log("Генерация JWT-токена...");
    const token = jwt.sign(
      { id: newUser.UserID, email: newUser.Email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    await transaction.commit();
    console.log("Регистрация успешна:", { id: newUser.UserID, email: newUser.Email });
    return res.status(201).json({
      message: "Регистрация успешна",
      token,
      user: { id: newUser.UserID, email: newUser.Email },
    });
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    await transaction.rollback();
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

// Новый маршрут для проверки токена
router.get("/verify-token", authenticateToken, (req, res) => {
  console.log("Маршрут /api/auth/verify-token вызван");
  try {
    // Если токен валиден, middleware authenticateToken уже добавил req.user
    res.status(200).json({
      message: "Токен действителен",
      user: req.user,
    });
  } catch (error) {
    console.error("Ошибка проверки токена:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;