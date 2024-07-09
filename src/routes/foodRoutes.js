const express = require('express');
const multer = require('multer');
const FoodController = require('./../controllers/foodController');
const authController = require('./../controllers/authController');
//  const messageController = require('./../controllers/messageController');

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Images/'); // Specify the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname); // Set the filename to be unique
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB or adjust as needed
});

//  ADMIN ROUTER

router.get('/stats', authController.protect, FoodController.getStats);

router.post(
  '/',
  authController.protect,
  authController.restrictTo('donor'),
  upload.single('foodImage'),
  FoodController.createFood
);

router.get(
  '/donation/history',
  authController.protect,
  FoodController.getDonationHistory
);

router.post('/foodRequest', authController.protect, FoodController.requestFood);
router.patch(
  '/:id/approve',
  authController.protect,
  FoodController.approveFood
);
router.post(
  '/request-donation/:id',
  authController.protect,
  authController.restrictTo('NGO'),
  FoodController.requestFood
);

router.get('/', FoodController.getAllFoods);
router.get('/admin-donate', FoodController.getAllAdminFoods);
router.get('/:id', authController.protect, FoodController.getFoodById);
router.patch(
  '/:id',
  authController.protect,
  upload.single('foodImage'),
  FoodController.updateFood
);
router.delete('/:id', authController.protect, FoodController.deleteFood);

//  ADMIN ROUTER

router.get('/stats', authController.protect, FoodController.getStats);

module.exports = router;
