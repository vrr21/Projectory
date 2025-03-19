const sql = require('mssql');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Конфигурация подключения к MSSQL
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    enableArithAbort: true,
  },
};

// Функция подключения к MSSQL
const connectDB = async () => {
  try {
    await sql.connect(dbConfig);
    console.log('Подключено к базе данных MSSQL');
  } catch (err) {
    console.error('Ошибка подключения к MSSQL:', err);
  }
};

// Функция выполнения запросов к базе данных
const queryDB = async (query, params = []) => {
  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index + 1}`, param);
    });
    return await request.query(query);
  } catch (err) {
    console.error('Ошибка выполнения запроса:', err);
    throw err;
  }
};

// Регистрация пользователя
const registerUser = async (username, password, role) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO [User] (Username, PasswordHash, Role) VALUES (@param1, @param2, @param3)`;
    await queryDB(query, [username, hashedPassword, role]);
    return { message: 'Пользователь успешно зарегистрирован' };
  } catch (err) {
    throw new Error('Ошибка регистрации пользователя');
  }
};

// Авторизация пользователя
const loginUser = async (username, password) => {
  try {
    const query = `SELECT UserID, PasswordHash, Role FROM [User] WHERE Username = @param1`;
    const result = await queryDB(query, [username]);
    if (result.recordset.length === 0) throw new Error('Пользователь не найден');

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) throw new Error('Неверный пароль');

    const token = jwt.sign({ userID: user.UserID, role: user.Role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { token };
  } catch (err) {
    throw new Error('Ошибка авторизации');
  }
};

module.exports = { sql, connectDB, queryDB, registerUser, loginUser };
