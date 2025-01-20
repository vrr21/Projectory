const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
  // Регистрация пользователя
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Проверка, существует ли пользователь с таким email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email уже существует!' });
      }

      // Хеширование пароля и создание нового пользователя
      const hashedPassword = bcrypt.hashSync(password, 7);
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();

      // Генерация токена
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(201).json({ message: 'Пользователь успешно зарегистрирован!', token });
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  // Авторизация пользователя
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Поиск пользователя по email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Проверка пароля
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Неверный пароль' });
      }

      // Генерация токена
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ token });
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
}

module.exports = new AuthController();
