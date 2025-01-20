const Router = require('express');
const router = new Router();
const controller = require('./authController');
const { check } = require('express-validator');

router.post('/registration', [
  check('email', 'Email не может быть пустым').isEmail(),
  check('password', 'Пароль должен быть больше 4 и меньше 10 символов').isLength({ min: 4, max: 10 }),
], controller.register);

router.post('/login', controller.login);

module.exports = router;
