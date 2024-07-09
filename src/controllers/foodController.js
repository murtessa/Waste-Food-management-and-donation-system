const Food = require('./../Models/foodModel');
const User = require('./../Models/userModel.js');
const AppError = require('./../util/appError');
const catchAsync = require('./../util/catchError');
const APIFeatures = require('./../util/apiFeatures.js');

// const jwt = require('jsonwebtoken');

exports.createFood = catchAsync(async (req, res, next) => {
  try {
    // Extract the logged-in user's ID from the request
    const userId = req.user.id; // Assuming the user ID is available in req.user

    // Create a new food donation record
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }
    const newFood = new Food({
      name: req.body.name,
      category: req.body.category,
      rating: req.body.rating || 4, // Default rating if not provided
      quantity: req.body.quantity,
      expiryDate: req.body.expiryDate,
      donor: userId, // Associate the donor with the logged-in user's ID
      status: req.body.status || 'Pending', // Default status if not provided
      // Add other fields as needed
      foodImage: req.file.filename,
    });

    // Save the food donation record to the database
    await newFood.save();

    res
      .status(201)
      .json({ message: 'Food donated successfully', food: newFood });
  } catch (err) {
    console.error('Error donating food:', err);
    res.status(500).json({ error: 'Failed to donate food' });
  }
});

exports.getAllFoods = catchAsync(async (req, res, next) => {
  //EXECUTE QUERY
  try {
    const features = new APIFeatures(Food.find(), req.query).multfilter();

    const foods = await features.query.populate({
      path: 'recipient',
      select: 'fullName',
    });

    res.status(200).json({
      status: 'success',
      results: foods.length,
      data: {
        foods,
      },
    });
  } catch (err) {
    console.error('Error fetching foods:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

exports.getAllAdminFoods = catchAsync(async (req, res, next) => {
  try {
    const features = new APIFeatures(Food.find(), req.query).multfilter();
    const foods = await features.query.populate([
      {
        path: 'recipient',
        select: 'fullName email',
      },
      {
        path: 'donor',
        select: 'fullName email',
      },
    ]);

    // Transform the data to set default value for null recipient
    const transformedFoods = foods.map((food) => ({
      ...food.toObject(),
      recipient: food.recipient
        ? {
            fullName: food.recipient.fullName,
            email: food.recipient.email,
          }
        : 'not requested',
    }));

    res.status(200).json({
      status: 'success',
      results: transformedFoods.length,
      data: {
        foods: transformedFoods,
      },
    });
  } catch (err) {
    console.error('Error fetching foods:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});
exports.getDonationHistory = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in req.user

    // Initialize API features for filtering and searching
    const features = new APIFeatures(
      Food.find({ donor: userId }),
      req.query
    ).multfilter();

    const donationHistory = await features.query.populate({
      path: 'donor',
      select: 'fullName email phone address, userPhoto',
    });

    res.status(200).json({
      status: 'success',
      data: {
        donationHistory,
      },
    });
  } catch (error) {
    console.error('Error fetching donation history:', error);
    res.status(500).json({ error: 'Failed to fetch donation history' });
  }
});

exports.requestFood = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params; // Donation ID
    const ngoId = req.user.id; // Assuming NGO's ObjectId is stored in req.user.id

    const foodItem = await Food.findById(id);

    if (!foodItem) {
      return res.status(404).json({
        status: 'fail',
        message: 'Food donation not found',
      });
    }

    if (foodItem.recipient) {
      return res.status(400).json({
        status: 'fail',
        message: 'Food item already requested',
      });
    }

    if (foodItem.status === 'Approved') {
      return res.status(400).json({
        status: 'fail',
        message: 'Food item already approved',
      });
    }

    // If food status is pending, change it to requested
    if (foodItem.status === 'Pending') {
      foodItem.status = 'Requested';
      foodItem.recipient = ngoId;
      await foodItem.save();
    }

    // Fetch updated list of available donations
    const availableDonations = await Food.find({ recipient: null });

    res.status(200).json({
      status: 'success',
      data: {
        availableDonations,
      },
    });
  } catch (error) {
    console.error('Error requesting or approving food donation:', error);
    res.status(400).json({
      status: 'fail',
      message: 'Failed to request or approve food donation',
    });
  }
});

exports.approveFood = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params; // Donation ID

    const foodItem = await Food.findById(id).populate('recipient'); // Populate recipient for sending message

    if (!foodItem) {
      return res.status(404).json({
        status: 'fail',
        message: 'Food donation not found',
      });
    }

    if (foodItem.status !== 'Requested') {
      return res.status(400).json({
        status: 'fail',
        message:
          'Food item cannot be approved as it is not in requested status',
      });
    }

    // Update food status to 'Approved'
    foodItem.status = 'Approved';
    await foodItem.save();

    // Send message to the NGO
    const ngoUser = foodItem.recipient; // Assuming recipient is a User object
    const adminUser = req.user; // Assuming admin's user object is in req.user after authentication

    if (!ngoUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'Recipient NGO not found',
      });
    }

    // Example message format, customize as needed
    const messageContent = `Your request for food donation "${foodItem.name}" has been approved by admin.`;

    // Assuming you have a method in your User model to handle sending messages
    await adminUser.sendMessage(ngoUser._id, adminUser._id, messageContent);

    // Fetch updated list of available donations
    const availableDonations = await Food.find({ recipient: null });

    res.status(200).json({
      status: 'success',
      data: {
        availableDonations,
      },
    });
  } catch (error) {
    console.error('Error approving food donation:', error);
    res.status(400).json({
      status: 'fail',
      message: 'Failed to approve food donation',
    });
  }
});

exports.getFoodById = catchAsync(async (req, res, next) => {
  const food = await Food.findById(req.params.id).populate('donor');

  if (!food) {
    return next(new AppError('Food with this ID is not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      food,
    },
  });
});

exports.updateFood = catchAsync(async (req, res, next) => {
  const updatedFields = req.body;

  if (req.file) {
    updatedFields.foodImage = req.file.filename; // Assuming you are using Multer for file uploads
  }

  const updatedFood = await Food.findByIdAndUpdate(
    req.params.id,
    updatedFields,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedFood) {
    return next(new AppError('Food with this ID is not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      food: updatedFood,
    },
  });
});

exports.deleteFood = catchAsync(async (req, res, next) => {
  const deletedFood = await Food.findByIdAndDelete(req.params.id);

  if (!deletedFood) {
    return next(new AppError('Food with this ID is not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getStats = catchAsync(async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalNGOs = await User.countDocuments({ role: 'NGO' });
    const totalDeliveries = await User.countDocuments({ role: 'delivery' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const totalDonations = await Food.countDocuments();
    const pendingDonations = await Food.countDocuments({ status: 'Pending' });
    const requestedDonations = await Food.countDocuments({
      status: 'Requested',
    });
    const approvedDonations = await Food.countDocuments({ status: 'Approved' });

    const stats = {
      totalUsers,
      totalDonors,
      totalNGOs,
      totalDeliveries,
      totalAdmins,
      totalDonations,
      pendingDonations,
      requestedDonations,
      approvedDonations,
    };

    res.status(200).json({ stats });
  } catch (err) {
    console.error('Error fetching stats:', err);
    next(new AppError('Failed to fetch stats', 500));
  }
});
