// back/generatePasswordHash.js
const bcrypt = require("bcryptjs");

const generateHash = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Хеш для пароля "${password}": ${hashedPassword}`);
  } catch (error) {
    console.error("Ошибка генерации хеша:", error);
  }
};

generateHash("password123"); // Пароль для ivan
generateHash("admin123");   // Пароль для petr
generateHash("anna123");    // Пароль для anna