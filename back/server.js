const express = require("express");
const mssql = require("mssql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Проверка, что все переменные окружения загружены
console.log("Проверка переменных окружения:");
console.log("PORT:", process.env.PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// Настройки подключения к базе данных из .env
const dbConfig = {
  user: process.env.DB_USER, // ProssLibrann
  password: process.env.DB_PASSWORD, // 123456789
  server: process.env.DB_HOST, // localhost
  port: parseInt(process.env.DB_PORT), // 1433
  database: process.env.DB_NAME, // KURSACHBD
  options: {
    encrypt: true, // Для MSSQL рекомендуется включить шифрование
    trustServerCertificate: true, // Для локального сервера
  },
};

async function startDB() {
  try {
    console.log("Попытка подключения к базе данных...");
    await mssql.connect(dbConfig);
    console.log("База данных подключена");
  } catch (err) {
    console.error("Ошибка подключения к БД:", err);
    process.exit(1); // Завершаем процесс, если не удалось подключиться
  }
}

startDB();

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("Токен не предоставлен в запросе");
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Неверный токен:", err.message);
      return res.status(403).json({ error: "Неверный токен" });
    }
    req.user = user;
    console.log("Токен успешно проверен, пользователь:", req.user);
    next();
  });
};

// Регистрация пользователя
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  console.log("Запрос на регистрацию:", req.body); // Логирование входящих данных

  if (!email || !password) {
    console.log("Email или пароль не предоставлены");
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    const checkUser = await pool
      .request()
      .input("email", mssql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @email");

    if (checkUser.recordset.length > 0) {
      console.log(`Пользователь с email ${email} уже существует`);
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employeeResult = await pool
      .request()
      .input("FullName", mssql.NVarChar, "Новый пользователь")
      .input("Email", mssql.NVarChar, email)
      .input("Phone", mssql.NVarChar, null)
      .input("PositionID", mssql.Int, null)
      .query(
        "INSERT INTO Employee (FullName, Email, Phone, PositionID) OUTPUT INSERTED.EmployeeID VALUES (@FullName, @Email, @Phone, @PositionID)"
      );

    const employeeId = employeeResult.recordset[0].EmployeeID;

    await pool
      .request()
      .input("EmployeeID", mssql.Int, employeeId)
      .input("Username", mssql.NVarChar, email.split("@")[0])
      .input("Email", mssql.NVarChar, email)
      .input("PasswordHash", mssql.NVarChar, passwordHash)
      .input("IsAdmin", mssql.Bit, 0)
      .input("Role", mssql.NVarChar, "Сотрудник")
      .query(
        "INSERT INTO Users (EmployeeID, Username, Email, PasswordHash, IsAdmin, Role) VALUES (@EmployeeID, @Username, @Email, @PasswordHash, @IsAdmin, @Role)"
      );

    console.log(`Пользователь с email ${email} успешно зарегистрирован`);
    res.status(201).json({ message: "Регистрация успешна" });
  } catch (err) {
    console.error("Ошибка при регистрации:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Авторизация пользователя
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("Запрос на авторизацию:", req.body); // Логирование входящих данных

  if (!email || !password) {
    console.log("Email или пароль не предоставлены");
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    const userResult = await pool
      .request()
      .input("email", mssql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @email");

    if (userResult.recordset.length === 0) {
      console.log(`Пользователь с email ${email} не найден`);
      return res.status(400).json({ error: "Пользователь не найден" });
    }

    const user = userResult.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);

    if (!isPasswordValid) {
      console.log(`Неверный пароль для email ${email}`);
      return res.status(400).json({ error: "Неверный пароль" });
    }

    const token = jwt.sign(
      { userId: user.UserID, employeeId: user.EmployeeID, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`Токен сгенерирован для email ${email}: ${token}`);
    res.json({ token });
  } catch (err) {
    console.error("Ошибка авторизации:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Проверка валидности токена
app.get("/api/auth/verify-token", authenticateToken, async (req, res) => {
  console.log("Маршрут /api/auth/verify-token вызван");
  try {
    console.log("Токен успешно проверен");
    res.json({ message: "Токен действителен" });
  } catch (err) {
    console.error("Ошибка проверки токена:", err);
    res.status(401).json({ error: "Недействительный токен" });
  }
});

// Получение задач пользователя
app.get("/api/tasks", authenticateToken, async (req, res) => {
  const employeeId = req.user.employeeId;

  try {
    const pool = await mssql.connect(dbConfig);
    const tasks = await pool
      .request()
      .input("employeeId", mssql.Int, employeeId)
      .query(
        `SELECT te.TaskExecutionID AS id, co.Description AS title, s.Name AS status, 
         te.ExecutionDate AS deadline, te.HoursSpent AS hoursSpent, tt.Name AS type
         FROM TaskExecution te
         JOIN CustomerOrder co ON te.OrderID = co.OrderID
         JOIN Status s ON te.StatusID = s.StatusID
         JOIN Stage st ON te.StageID = st.StageID
         JOIN TaskType tt ON st.TaskTypeID = tt.TaskTypeID
         WHERE te.EmployeeID = @employeeId`
      );

    console.log(`Задачи для сотрудника ${employeeId} успешно получены`);
    res.json(tasks.recordset);
  } catch (err) {
    console.error("Ошибка получения задач:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Добавление задачи
app.post("/api/tasks", authenticateToken, async (req, res) => {
  const { title, type, deadline } = req.body;
  const employeeId = req.user.employeeId;

  if (!title || !type || !deadline) {
    console.log("Не все поля предоставлены для добавления задачи");
    return res.status(400).json({ error: "Заполните все поля" });
  }

  try {
    const pool = await mssql.connect(dbConfig);

    // Получаем TaskTypeID
    const taskTypeResult = await pool
      .request()
      .input("type", mssql.NVarChar, type)
      .query("SELECT TaskTypeID FROM TaskType WHERE Name = @type");

    if (taskTypeResult.recordset.length === 0) {
      console.log(`Тип задачи "${type}" не найден`);
      return res.status(400).json({ error: "Неверный тип задачи" });
    }
    const taskTypeId = taskTypeResult.recordset[0].TaskTypeID;

    // Создаем новый заказ
    const customerId = 1; // Предположим, у нас есть тестовый клиент
    const orderResult = await pool
      .request()
      .input("CustomerID", mssql.Int, customerId)
      .input("Description", mssql.NVarChar, title)
      .input("OrderDate", mssql.Date, new Date())
      .input("DueDate", mssql.Date, deadline)
      .input("OrderTypeID", mssql.Int, 1) // Стандартный заказ
      .input("StatusID", mssql.Int, 1) // "В работе"
      .query(
        "INSERT INTO CustomerOrder (CustomerID, Description, OrderDate, DueDate, OrderTypeID, StatusID) OUTPUT INSERTED.OrderID VALUES (@CustomerID, @Description, @OrderDate, @DueDate, @OrderTypeID, @StatusID)"
      );

    const orderId = orderResult.recordset[0].OrderID;

    // Создаем этап
    const stageResult = await pool
      .request()
      .input("Name", mssql.NVarChar, `Этап для ${title}`)
      .input("Deadline", mssql.Date, deadline)
      .input("TaskTypeID", mssql.Int, taskTypeId)
      .query(
        "INSERT INTO Stage (Name, Deadline, TaskTypeID) OUTPUT INSERTED.StageID VALUES (@Name, @Deadline, @TaskTypeID)"
      );

    const stageId = stageResult.recordset[0].StageID;

    // Создаем задачу
    await pool
      .request()
      .input("OrderID", mssql.Int, orderId)
      .input("EmployeeID", mssql.Int, employeeId)
      .input("StageID", mssql.Int, stageId)
      .input("ExecutionDate", mssql.Date, new Date())
      .input("HoursSpent", mssql.Int, 0)
      .input("StatusID", mssql.Int, 1) // "В работе"
      .query(
        "INSERT INTO TaskExecution (OrderID, EmployeeID, StageID, ExecutionDate, HoursSpent, StatusID) VALUES (@OrderID, @EmployeeID, @StageID, @ExecutionDate, @HoursSpent, @StatusID)"
      );

    // Добавляем назначение задачи
    await pool
      .request()
      .input("TaskTypeID", mssql.Int, taskTypeId)
      .input("EmployeeID", mssql.Int, employeeId)
      .query(
        "INSERT INTO TaskAssignment (TaskTypeID, EmployeeID) VALUES (@TaskTypeID, @EmployeeID)"
      );

    console.log(`Задача "${title}" успешно добавлена для сотрудника ${employeeId}`);
    res.status(201).json({ message: "Задача добавлена" });
  } catch (err) {
    console.error("Ошибка добавления задачи:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Обновление статуса задачи
app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, hoursSpent } = req.body;
  const employeeId = req.user.employeeId;

  try {
    const pool = await mssql.connect(dbConfig);

    // Проверяем, что задача принадлежит сотруднику
    const taskCheck = await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .input("EmployeeID", mssql.Int, employeeId)
      .query(
        "SELECT * FROM TaskExecution WHERE TaskExecutionID = @TaskExecutionID AND EmployeeID = @EmployeeID"
      );

    if (taskCheck.recordset.length === 0) {
      console.log(`Сотрудник ${employeeId} не имеет доступа к задаче ${id}`);
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    // Получаем StatusID
    const statusResult = await pool
      .request()
      .input("Name", mssql.NVarChar, status)
      .query("SELECT StatusID FROM Status WHERE Name = @Name");

    if (statusResult.recordset.length === 0) {
      console.log(`Статус "${status}" не найден`);
      return res.status(400).json({ error: "Неверный статус" });
    }
    const statusId = statusResult.recordset[0].StatusID;

    // Обновляем задачу
    await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .input("StatusID", mssql.Int, statusId)
      .input("HoursSpent", mssql.Int, hoursSpent)
      .query(
        "UPDATE TaskExecution SET StatusID = @StatusID, HoursSpent = @HoursSpent WHERE TaskExecutionID = @TaskExecutionID"
      );

    console.log(`Задача ${id} обновлена для сотрудника ${employeeId}`);
    res.json({ message: "Задача обновлена" });
  } catch (err) {
    console.error("Ошибка обновления задачи:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Тестовый маршрут для проверки работы сервера
app.get("/api/test", (req, res) => {
  console.log("Тестовый маршрут вызван");
  res.json({ message: "Сервер работает" });
});

// Запуск сервера на порту из .env
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});