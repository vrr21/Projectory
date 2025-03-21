const bcrypt = require("bcryptjs");
const { Users } = require("./models"); // Проверьте путь к вашей модели

async function testPassword() {
    const email = "admin@gmail.com"; // Укажите email администратора
    const enteredPassword = "1234567890"; // Пароль, который вводите в форме

    const user = await Users.findOne({ where: { Email: email } });

    if (!user) {
        console.log("❌ Пользователь не найден!");
        return;
    }

    console.log("✅ Найден пользователь:", user.Email);
    console.log("🔑 Проверяем пароль...");

    const isMatch = await bcrypt.compare(enteredPassword, user.PasswordHash);
    console.log("Пароль верный?", isMatch);
}

testPassword();
