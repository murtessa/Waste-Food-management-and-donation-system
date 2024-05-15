const express = require('express');
const multer = require('multer');
// const cors = require('cors');

const UserController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
// const app = express();
// app.use(cors());

const router = express.Router();
// Routes for users

// router.post('/signup', authController.signup);
// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname); // Set the filename to be unique
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB or adjust as needed
});

// Route for user registration with image upload
router.post('/signup', upload.single('userPhoto'), authController.signup);
router.post('/login', authController.login);
router.post('/forgetPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch('/reset_password/:token', authController.reset_password);

router.get(
  '/me',
  authController.protect,
  UserController.getMe,
  UserController.getUserById
);

router.patch('/updateMe', authController.protect, UserController.updateMe);

router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
);

router.delete('/deactiveMe', authController.protect, UserController.deactiveMe);

router.patch(
  '/reactivateMe',
  authController.protect,
  UserController.reactivateMe
);

router.post('/create', UserController.createUser);
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.patch('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUserById);

module.exports = router;
