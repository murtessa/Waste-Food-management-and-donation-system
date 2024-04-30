const User = require('./../Models/userModel');
const AppError = require('./../util/appError');
const catchAsync = require('./../util/catchError');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  if (!users) {
    return next(new AppError('No user is found ', 404));
  }

  res.status(200).json({
    status: 'success',
    result: users.length,
    data: {
      users,
    },
  });
  next();
});

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  res.status(200).json({
    status: 'success',
    data: {
      newUser,
    },
  });
});

exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User with this Id is not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const curUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!curUser) {
    return next(new AppError('there is no user with this id', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      curUser,
    },
  });
});

exports.deleteUserById = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('there is no user with this id'));
  }

  res.status(200).json({
    status: 'success',
    data: null,
  });
});

exports.deactiveMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
  // next();
});
