// back/server.js
const express = require("express");
const mssql = require("mssql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Логирование переменных окружения
console.log("Проверка переменных окружения:");
console.log("PORT:", process.env.PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// Настройка подключения к базе данных
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function startDB() {
  try {
    console.log("Попытка подключения к базе данных...");
    await mssql.connect(dbConfig);
    console.log("База данных подключена");
  } catch (err) {
    console.error("Ошибка подключения к БД:", err.message, err.stack);
    process.exit(1);
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
  console.log("Маршрут /api/auth/register вызван");
  const { fullName, phone, email, password } = req.body;

  console.log("Запрос на регистрацию:", req.body);

  if (!fullName || !phone || !email || !password) {
    console.log("Не все поля предоставлены");
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    console.log("Некорректный email:", email);
    return res.status(400).json({ error: "Email должен быть формата @gmail.com" });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log("Некорректный пароль:", password);
    return res.status(400).json({ error: "Пароль должен содержать минимум 8 символов, включая буквы и цифры" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    console.log("Подключение к базе данных успешно");

    console.log(`Проверка email ${email} в базе данных...`);
    const checkEmail = await pool
      .request()
      .input("email", mssql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @email");

    if (checkEmail.recordset.length > 0) {
      console.log(`Пользователь с email ${email} уже существует`);
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Пароль успешно хеширован");

    console.log("Создание записи в таблице Employee...");
    const employeeResult = await pool
      .request()
      .input("FullName", mssql.NVarChar, fullName)
      .input("Email", mssql.NVarChar, email)
      .input("Phone", mssql.NVarChar, phone)
      .input("PositionID", mssql.Int, null)
      .query(
        "INSERT INTO Employee (FullName, Email, Phone, PositionID) OUTPUT INSERTED.EmployeeID VALUES (@FullName, @Email, @Phone, @PositionID)"
      );

    const employeeId = employeeResult.recordset[0].EmployeeID;
    console.log(`Сотрудник создан с ID: ${employeeId}`);

    console.log("Создание записи в таблице Users...");
    await pool
      .request()
      .input("EmployeeID", mssql.Int, employeeId)
      .input("Email", mssql.NVarChar, email)
      .input("Password", mssql.NVarChar, hashedPassword)
      .input("IsAdmin", mssql.Bit, 0)
      .input("Role", mssql.NVarChar, "Сотрудник")
      .query(
        "INSERT INTO Users (EmployeeID, Email, Password, IsAdmin, Role) VALUES (@EmployeeID, @Email, @Password, @IsAdmin, @Role)"
      );

    console.log(`Пользователь с email ${email} успешно зарегистрирован`);
    res.status(201).json({ message: "Регистрация успешна" });
  } catch (err) {
    console.error("Ошибка при регистрации:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Авторизация пользователя
app.post("/api/auth/login", async (req, res) => {
  console.log("Маршрут /api/auth/login вызван");
  const { email, password } = req.body;

  console.log("Полученные данные для авторизации:", { email, password });

  // Проверка наличия email и пароля
  if (!email || !password) {
    console.log("Email или пароль не предоставлены:", { email, password });
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    console.log("Подключение к базе данных успешно");

    // Поиск пользователя по email
    const userResult = await pool
      .request()
      .input("email", mssql.NVarChar, email)
      .query("SELECT * FROM Users WHERE Email = @email");

    if (userResult.recordset.length === 0) {
      console.log(`Пользователь с email ${email} не найден`);
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    const user = userResult.recordset[0];
    console.log("Найден пользователь:", user);

    // Проверка пароля
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      console.log(`Неверный пароль для email ${email}. Введённый пароль: ${password}, хешированный пароль в БД: ${user.Password}`);
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    // Генерация токена
    const token = jwt.sign(
      { userId: user.UserID, employeeId: user.EmployeeID, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`Авторизация успешна для email ${email}. Сгенерирован токен: ${token}`);
    res.json({ token, role: user.Role });
  } catch (err) {
    console.error("Ошибка авторизации:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Проверка токена
app.get("/api/auth/verify-token", authenticateToken, async (req, res) => {
  console.log("Маршрут /api/auth/verify-token вызван");
  try {
    console.log("Токен успешно проверен");
    res.json({ message: "Токен действителен", role: req.user.role, employeeId: req.user.employeeId });
  } catch (err) {
    console.error("Ошибка проверки токена:", err.message, err.stack);
    res.status(401).json({ error: "Недействительный токен", details: err.message });
  }
});

// Получение задач
app.get("/api/tasks", authenticateToken, async (req, res) => {
  const employeeId = req.user.employeeId;
  const { employeeId: queryEmployeeId } = req.query;

  try {
    const pool = await mssql.connect(dbConfig);
    let tasks;

    if (req.user.role === "Администратор" && queryEmployeeId) {
      tasks = await pool
        .request()
        .input("employeeId", mssql.Int, queryEmployeeId)
        .query(
          `SELECT te.TaskExecutionID AS TaskID, co.Description AS Title, s.Name AS Status, 
                  te.ExecutionDate AS DueDate, te.HoursSpent AS hoursSpent, st.Name AS Description
           FROM TaskExecution te
           JOIN CustomerOrder co ON te.OrderID = co.OrderID
           JOIN Status s ON te.StatusID = s.StatusID
           JOIN Stage st ON te.StageID = st.StageID
           WHERE te.EmployeeID = @employeeId`
        );
    } else {
      tasks = await pool
        .request()
        .input("employeeId", mssql.Int, employeeId)
        .query(
          `SELECT te.TaskExecutionID AS TaskID, co.Description AS Title, s.Name AS Status, 
                  te.ExecutionDate AS DueDate, te.HoursSpent AS hoursSpent, st.Name AS Description
           FROM TaskExecution te
           JOIN CustomerOrder co ON te.OrderID = co.OrderID
           JOIN Status s ON te.StatusID = s.StatusID
           JOIN Stage st ON te.StageID = st.StageID
           WHERE te.EmployeeID = @employeeId`
        );
    }

    console.log(`Задачи для сотрудника ${employeeId} успешно получены:`, tasks.recordset);
    res.json(tasks.recordset);
  } catch (err) {
    console.error("Ошибка получения задач:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Добавление задачи
app.post("/api/tasks", authenticateToken, async (req, res) => {
  const { title, description, dueDate, employeeId, stageId, statusId, executionDate, hoursSpent } = req.body;

  if (!title || !description || !dueDate || !employeeId || !stageId || !statusId || !executionDate) {
    console.log("Не все поля предоставлены для добавления задачи:", req.body);
    return res.status(400).json({ error: "Заполните все поля" });
  }

  try {
    const pool = await mssql.connect(dbConfig);

    const orderResult = await pool
      .request()
      .input("CustomerID", mssql.Int, 1)
      .input("Description", mssql.NVarChar, title)
      .input("OrderDate", mssql.Date, new Date())
      .input("DueDate", mssql.Date, dueDate)
      .input("OrderTypeID", mssql.Int, 1)
      .input("StatusID", mssql.Int, 1)
      .query(
        "INSERT INTO CustomerOrder (CustomerID, Description, OrderDate, DueDate, OrderTypeID, StatusID) OUTPUT INSERTED.OrderID VALUES (@CustomerID, @Description, @OrderDate, @DueDate, @OrderTypeID, @StatusID)"
      );

    const orderId = orderResult.recordset[0].OrderID;

    const taskResult = await pool
      .request()
      .input("OrderID", mssql.Int, orderId)
      .input("EmployeeID", mssql.Int, employeeId)
      .input("StageID", mssql.Int, stageId)
      .input("ExecutionDate", mssql.Date, executionDate)
      .input("HoursSpent", mssql.Int, hoursSpent || 0)
      .input("StatusID", mssql.Int, statusId)
      .query(
        "INSERT INTO TaskExecution (OrderID, EmployeeID, StageID, ExecutionDate, HoursSpent, StatusID) OUTPUT INSERTED.TaskExecutionID VALUES (@OrderID, @EmployeeID, @StageID, @ExecutionDate, @HoursSpent, @StatusID)"
      );

    console.log(`Задача "${title}" успешно добавлена для сотрудника ${employeeId}`);
    res.status(201).json({ TaskID: taskResult.recordset[0].TaskExecutionID });
  } catch (err) {
    console.error("Ошибка добавления задачи:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Обновление задачи
app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, hoursSpent, employeeId } = req.body;

  if (!status || hoursSpent === undefined) {
    console.log("Не все поля предоставлены для обновления задачи:", req.body);
    return res.status(400).json({ error: "Статус и часы работы обязательны" });
  }

  try {
    const pool = await mssql.connect(dbConfig);

    const taskCheck = await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .query("SELECT * FROM TaskExecution WHERE TaskExecutionID = @TaskExecutionID");

    if (taskCheck.recordset.length === 0) {
      console.log(`Задача ${id} не найдена`);
      return res.status(404).json({ error: "Задача не найдена" });
    }

    const statusResult = await pool
      .request()
      .input("Name", mssql.NVarChar, status)
      .query("SELECT StatusID FROM Status WHERE Name = @Name");

    if (statusResult.recordset.length === 0) {
      console.log(`Статус "${status}" не найден`);
      return res.status(400).json({ error: "Неверный статус" });
    }
    const statusId = statusResult.recordset[0].StatusID;

    await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .input("StatusID", mssql.Int, statusId)
      .input("HoursSpent", mssql.Int, hoursSpent)
      .input("EmployeeID", mssql.Int, employeeId || taskCheck.recordset[0].EmployeeID)
      .query(
        "UPDATE TaskExecution SET StatusID = @StatusID, HoursSpent = @HoursSpent, EmployeeID = @EmployeeID WHERE TaskExecutionID = @TaskExecutionID"
      );

    console.log(`Задача ${id} обновлена`);
    res.json({ message: "Задача обновлена" });
  } catch (err) {
    console.error("Ошибка обновления задачи:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Удаление задачи
app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await mssql.connect(dbConfig);

    const taskCheck = await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .query("SELECT * FROM TaskExecution WHERE TaskExecutionID = @TaskExecutionID");

    if (taskCheck.recordset.length === 0) {
      console.log(`Задача ${id} не найдена`);
      return res.status(404).json({ error: "Задача не найдена" });
    }

    await pool
      .request()
      .input("TaskExecutionID", mssql.Int, id)
      .query("DELETE FROM TaskExecution WHERE TaskExecutionID = @TaskExecutionID");

    console.log(`Задача ${id} удалена`);
    res.json({ message: "Задача удалена" });
  } catch (err) {
    console.error("Ошибка удаления задачи:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение списка сотрудников
app.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    const employees = await pool
      .request()
      .query(
        `SELECT e.EmployeeID, e.FullName, e.Email, e.Phone, p.Name AS Position
         FROM Employee e
         LEFT JOIN Position p ON e.PositionID = p.PositionID`
      );

    console.log("Список сотрудников успешно получен");
    res.json(employees.recordset);
  } catch (err) {
    console.error("Ошибка получения списка сотрудников:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение данных сотрудника
app.get("/api/employees/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await mssql.connect(dbConfig);
    const employee = await pool
      .request()
      .input("EmployeeID", mssql.Int, id)
      .query(
        `SELECT e.EmployeeID, e.FullName, e.Email, e.Phone, p.Name AS Position
         FROM Employee e
         LEFT JOIN Position p ON e.PositionID = p.PositionID
         WHERE e.EmployeeID = @EmployeeID`
      );

    if (employee.recordset.length === 0) {
      console.log(`Сотрудник ${id} не найден`);
      return res.status(404).json({ error: "Сотрудник не найден" });
    }

    console.log(`Данные сотрудника ${id} успешно получены`);
    res.json(employee.recordset[0]);
  } catch (err) {
    console.error("Ошибка получения сотрудника:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение данных пользователя
app.get("/api/users/:employeeId", authenticateToken, async (req, res) => {
  const { employeeId } = req.params;

  try {
    const pool = await mssql.connect(dbConfig);
    const user = await pool
      .request()
      .input("EmployeeID", mssql.Int, employeeId)
      .query("SELECT * FROM Users WHERE EmployeeID = @EmployeeID");

    if (user.recordset.length === 0) {
      console.log(`Пользователь с employeeId ${employeeId} не найден`);
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    console.log(`Данные пользователя с employeeId ${employeeId} успешно получены`);
    res.json(user.recordset[0]);
  } catch (err) {
    console.error("Ошибка получения пользователя:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение этапов
app.get("/api/stages", authenticateToken, async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    const stages = await pool
      .request()
      .query("SELECT StageID, Name FROM Stage");

    console.log("Список этапов успешно получен");
    res.json(stages.recordset);
  } catch (err) {
    console.error("Ошибка получения этапов:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение статусов
app.get("/api/statuses", authenticateToken, async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    const statuses = await pool
      .request()
      .query("SELECT StatusID, Name FROM Status");

    console.log("Список статусов успешно получен");
    res.json(statuses.recordset);
  } catch (err) {
    console.error("Ошибка получения статусов:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Получение журнала заявок
app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    const orders = await pool
      .request()
      .query(
        `SELECT co.OrderID, co.Description, co.OrderDate, co.DueDate, 
                c.Name AS Customer, ot.Name AS OrderType, s.Name AS Status
         FROM CustomerOrder co
         JOIN Customer c ON co.CustomerID = c.CustomerID
         JOIN OrderType ot ON co.OrderTypeID = ot.OrderTypeID
         JOIN Status s ON co.StatusID = s.StatusID`
      );

    console.log("Журнал заявок успешно получен");
    res.json(orders.recordset);
  } catch (err) {
    console.error("Ошибка получения журнала заявок:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Отчёт по задачам сотрудника
app.get("/api/reports/employee-tasks/:employeeId", authenticateToken, async (req, res) => {
  const { employeeId } = req.params;

  if (req.user.role !== "Администратор" && req.user.employeeId != employeeId) {
    console.log(`Пользователь ${req.user.userId} не имеет доступа к отчетам сотрудника ${employeeId}`);
    return res.status(403).json({ error: "Доступ запрещен" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    const report = await pool
      .request()
      .input("employeeId", mssql.Int, employeeId)
      .query(
        `SELECT e.FullName, te.TaskExecutionID, co.Description AS TaskTitle, s.Name AS Status, te.HoursSpent
         FROM TaskExecution te
         JOIN Employee e ON te.EmployeeID = e.EmployeeID
         JOIN CustomerOrder co ON te.OrderID = co.OrderID
         JOIN Status s ON te.StatusID = s.StatusID
         WHERE te.EmployeeID = @employeeId`
      );

    console.log(`Отчет по задачам для сотрудника ${employeeId} успешно получен`);
    res.json(report.recordset);
  } catch (err) {
    console.error("Ошибка получения отчета по задачам сотрудника:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Отчёт по задачам за период
app.get("/api/reports/employee-tasks-period/:employeeId", authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  if (req.user.role !== "Администратор" && req.user.employeeId != employeeId) {
    console.log(`Пользователь ${req.user.userId} не имеет доступа к отчетам сотрудника ${employeeId}`);
    return res.status(403).json({ error: "Доступ запрещен" });
  }

  if (!startDate || !endDate) {
    console.log("Не указаны даты для отчета:", req.query);
    return res.status(400).json({ error: "Укажите даты начала и окончания периода" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    const report = await pool
      .request()
      .input("employeeId", mssql.Int, employeeId)
      .input("startDate", mssql.Date, startDate)
      .input("endDate", mssql.Date, endDate)
      .query(
        `SELECT te.EmployeeID, e.FullName, te.ExecutionDate, s.Name AS Stage, 
                co.Description AS OrderDescription, te.HoursSpent
         FROM TaskExecution te
         JOIN Employee e ON te.EmployeeID = e.EmployeeID
         JOIN Stage s ON te.StageID = s.StageID
         JOIN CustomerOrder co ON te.OrderID = co.OrderID
         WHERE te.EmployeeID = @employeeId
         AND te.ExecutionDate BETWEEN @startDate AND @endDate
         ORDER BY te.ExecutionDate`
      );

    console.log(`Отчет по задачам за период для сотрудника ${employeeId} успешно получен`);
    res.json(report.recordset);
  } catch (err) {
    console.error("Ошибка получения отчета по задачам за период:", err.message, err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера", details: err.message });
  }
});

// Тестовый маршрут
app.get("/api/test", (req, res) => {
  console.log("Тестовый маршрут вызван");
  res.json({ message: "Сервер работает" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});