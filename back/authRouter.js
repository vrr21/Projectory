const Router = require('express');
const router = new Router();
const controller = require('./authController');
const { check } = require('express-validator');

// Регистрация
router.post(
  '/registration',
  [
    check('username', 'Username cannot be empty').notEmpty(),
    check('password', 'Password must be 4-10 characters long').isLength({
      min: 4,
      max: 10,
    }),
  ],
  controller.registration
);

// Логин
router.post('/login', controller.login);

// Получение пользователей
router.get('/users', controller.getUsers);

module.exports = router;
