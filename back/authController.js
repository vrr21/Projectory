const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Функция регистрации пользователя
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const newUser = await User.create({
      email,
      password: hashedPassword,
    });

    // Генерируем токен
    const token = jwt.sign({ userId: newUser.id }, "SECRET_KEY", { expiresIn: "7d" });

    return res.json({ token, message: "Регистрация успешна!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка регистрации" });
  }
};

// Функция авторизации пользователя
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ищем пользователя по email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Неправильный email или пароль" });
    }

    // Проверяем пароль
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Неправильный email или пароль" });
    }

    // Генерируем токен
    const token = jwt.sign({ userId: user.id }, "SECRET_KEY", { expiresIn: "7d" });

    return res.json({ token, message: "Авторизация успешна!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Ошибка авторизации" });
  }
};
