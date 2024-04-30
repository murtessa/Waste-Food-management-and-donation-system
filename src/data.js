const bcrypt = require('bcrypt');

const UserController = {
  signup: async (req, res, next) => {
    try {
      const {
        fullName,
        email,
        password,
        passwordConfirm,
        phone,
        address,
        role,
      } = req.body;
      const newUser = await User.create({
        fullName,
        email,
        password,
        passwordConfirm,
        phone,
        address,
        role,
      });
      res.status(201).json({ status: 'success', data: newUser });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
    next();
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide email and password',
        });
      }
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.correctPassword(password, user.password))) {
        return res
          .status(401)
          .json({ status: 'fail', message: 'Incorrect email or password' });
      }
      res.status(200).json({ status: 'success', data: user });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await User.find();
      res.status(200).json({ status: 'success', data: users });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      res.status(200).json({ status: 'success', data: user });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      res.status(200).json({ status: 'success', data: user });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      res.status(400).json({ status: 'fail', message: err.message });
    }
  },
};

module.exports = UserController;
