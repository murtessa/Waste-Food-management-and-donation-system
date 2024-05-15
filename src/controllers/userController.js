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

exports.reactivateMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: true });

  res.status(200).json({
    status: 'success',
    message: 'User reactivated successfully',
    data: null,
  });
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Get currently logged in user

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error if user POST password data

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update . please use /updatePassword',
        400
      )
    );
  }

  // 2) Filtered out unwanted feilds names that are not allowed to update

  const filteredBody = filterObj(req.body, 'fullName', 'email');

  // 3) Update user document

  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    message: ' Your Profile is Updated Successfully',
    data: {
      user: updateUser,
    },
  });
});
