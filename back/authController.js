// back/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Employee } = require("../models");

// Функция регистрации пользователя
exports.register = async (req, res) => {
  try {
    const { fullName, phone, email, username, password } = req.body;

    // Проверка email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email должен быть формата @gmail.com" });
    }

    // Проверяем, есть ли пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }

    // Проверяем, есть ли пользователь с таким username
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: "Этот username уже занят" });
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём сотрудника
    const newEmployee = await Employee.create({
      FullName: fullName,
      Email: email,
      Phone: phone,
      PositionID: null, // Можно добавить выбор позиции, если нужно
    });

    // Создаём пользователя
    const newUser = await User.create({
      employeeId: newEmployee.EmployeeID,
      username,
      email,
      password: hashedPassword,
      role: "Сотрудник", // По умолчанию "Сотрудник"
      isAdmin: 0,
    });

    // Генерируем токен
    const token = jwt.sign(
      { userId: newUser.id, employeeId: newUser.employeeId, role: newUser.role },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    return res.json({ token, message: "Регистрация успешна!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка регистрации" });
  }
};

// Функция авторизации пользователя
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Ищем пользователя по username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ error: "Неправильный username или пароль" });
    }

    // Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Неправильный username или пароль" });
    }

    // Генерируем токен
    const token = jwt.sign(
      { userId: user.id, employeeId: user.employeeId, role: user.role },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    return res.json({ token, message: "Авторизация успешна!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка авторизации" });
  }
};

// Функция проверки токена
exports.verifyToken = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Токен отсутствует" });
  }

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    res.json({ valid: true, role: decoded.role, employeeId: decoded.employeeId });
  } catch (error) {
    res.status(401).json({ error: "Недействительный токен" });
  }
};