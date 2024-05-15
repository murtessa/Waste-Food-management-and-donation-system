const Food = require('./../Models/foodModel');
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
  const features = new APIFeatures(Food.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();
  const foods = await features.query;

  // RESPONSE
  res.status(200).json({
    status: 'success',
    results: foods.length,
    data: {
      foods,
    },
  });
});

exports.getDonationHistory = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in req.user
    const donationHistory = await Food.find({ donor: userId }).populate(
      'donor'
    ); // Assuming 'donor' field references the User model
    res.status(200).json({ donationHistory });
  } catch (error) {
    console.error('Error fetching donation history:', error);
    res.status(500).json({ error: 'Failed to fetch donation history' });
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
  const updatedFood = await Food.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedFood) {
    return next(new AppError('Food with this ID is not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      updatedFood,
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

exports.requestFood = catchAsync(async (req, res, next) => {
  const { foodId, quantity, name } = req.body;
  const { ngoId } = req.user; // Assuming you have NGO information in req.user

  // Check if the NGO is authorized to request food (you can implement your own authorization logic)
  if (!ngoId) {
    return next(new AppError('Unauthorized to request food', 403));
  }

  // Check if the requested food item exists and is available
  const foodItem = await Food.findById(foodId);

  if (!foodItem || foodItem.name || foodItem.quantity < quantity) {
    return next(new AppError('Requested food item not available', 400));
  }

  // Reserve the requested quantity of food for the NGO by updating the recipient field
  foodItem.recipient = ngoId;
  await foodItem.save();

  // Send response indicating successful request
  res.status(200).json({
    status: 'success',
    message: 'Food requested successfully',
    data: {
      foodItem,
    },
  });
});
