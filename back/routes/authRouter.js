// back/authRouter.js
const express = require("express");
const router = express.Router();
const authController = require("./authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-token", authController.verifyToken);

module.exports = router;