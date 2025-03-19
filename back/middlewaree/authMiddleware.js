const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (req.method === "OPTIONS") {
    next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "Пользователь не авторизован" });
    }
    const decodedData = jwt.verify(token, "your-secret-key");
    req.user = decodedData;
    next();
  } catch (e) {
    console.error("Ошибка в middleware:", e);
    return res.status(403).json({ message: "Пользователь не авторизован" });
  }
};
