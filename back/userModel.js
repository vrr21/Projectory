const pool = require("./db");

// Добавление пользователя
const addUser = async (email, hashedPassword) => {
  const result = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
    [email, hashedPassword]
  );
  return result.rows[0];
};

// Поиск пользователя по email
const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

// Добавление роли пользователю
const addRoleToUser = async (userId, role) => {
  const roleResult = await pool.query("SELECT id FROM roles WHERE value = $1", [role]);
  const roleId = roleResult.rows[0].id;

  await pool.query(
    "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
    [userId, roleId]
  );
};

module.exports = { addUser, findUserByEmail, addRoleToUser };
