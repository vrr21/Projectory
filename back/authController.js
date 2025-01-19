const User = require('./models/User');
const Role = require('./models/Role');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { secret } = require('./config');

const generateAccessToken = (id, roles) => {
  const payload = {
    id,
    roles,
  };
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

class authController {
  async registration(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors });
      }

      const { username, password } = req.body;

      // Проверяем, существует ли пользователь
      const candidate = await User.findOne({ username });
      if (candidate) {
        return res.status(400).json({ message: 'User already exists' });
      }
console.log(req)
      const hashPassword = bcrypt.hashSync(password, 7);
      const userRole = await Role.findOne({ value: 'USER' });
      const user = new User({
        username,
        password: hashPassword,
        roles: [userRole ? userRole.value : 'USER'],
      });

      await user.save();
      return res.status(201).json({ message: 'User successfully registered' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Registration error' });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: `User ${username} not found` });
      }
      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Invalid password' });
      }
      const token = generateAccessToken(user._id, user.roles);
      return res.json({ token });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Login error' });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Cannot retrieve users' });
    }
  }
}

module.exports = new authController();
