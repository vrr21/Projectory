// back/generateHash.js
const bcrypt = require("bcryptjs");

async function generateHash() {
  const password = "admin123";
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log("Хешированный пароль:", hashedPassword);
}

generateHash();

//$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxx