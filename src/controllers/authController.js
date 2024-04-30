const crypto = require('crypto');
const { promisify } = require('util');

const User = require('./../Models/userModel');
const AppError = require('./../util/appError');
const catchAsync = require('./../util/catchError');
const jwt = require('jsonwebtoken');
const sendEmail = require('./../util/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if ((process.env.NODE_ENV = 'production')) cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message: 'User Registered successfully',
    role: user.role,
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  const newUser = await User.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    phone: req.body.phone,
    address: req.body.address,
    userPhoto: req.file.filename, // Save the filename in the userPhoto field
    role: req.body.role, // Save the role in the database
  });

  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist

  if (!email || !password) {
    return next(new AppError('Please insert your email  or password', 404));
  }

  // 2) Check if  user exists  and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3) If everything ok send token to client

  createAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it is there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged in ! please login to get access', 401)
    );
  }
  // 2) verification token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user is still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('the token belonging to this user does not exist', 401)
    );
  }
  // 4) check if user changed password after JWT the token be issued

  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('user recently changed password. Please login again', 401)
    );
  }

  // GRANT ASSECC TO PROTECTED
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action, 403')
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }
  // 2) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) send it to user email
  const resetURL = `${req.protocol}://${req
    .get('host')
    .replace('5000', '3000')}/resetPassword/${resetToken}`;

  // const resetURL = `${req.protocol}://${req.get(
  //   'host'
  // )}/api/donate/user/resetPassword/${resetToken}`;

  const message = `Forgot your password ? submit a Patch request with your new password and 
    passwordConiform to: ${resetURL}.\n if you didnt forget your password ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'sucess',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordExpireDate = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('there was an error to sending email:  Try again ? ', 500)
    );
  }
});

exports.reset_password = catchAsync(async (req, res, next) => {
  const { email, newPassword, token } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the token matches the user's reset token and is not expired
    if (user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired reset token' });
    }

    // Update the user's password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Log the user in after password reset (optional)
    const token = createAndSendToken(user, 200, res);
    res.cookie('token', token, { httpOnly: true });
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1)  Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordExpireDate: hashedToken,
    passwordExpireDate: { $gte: Date.now() },
  });
  // 2)  if token has not expired  and there is the user set the new password

  if (!user) {
    return next(new AppError('token is invalid or expires', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordExpireDate = undefined;
  await user.save();
  // 3)  update changedPasswordAt property for the user

  // 4) log the user in and send JWT

  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from collection

  const user = await User.findById(req.user.id).select('+password');

  // 2) check if POSTED  current password correct

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('your current password wrong !', 401));
  }

  // 3) if so, update password carefull
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //  User. findByIdAndUpdate will not work here

  //  4) the login succesful

  createAndSendToken(user, 200, res);
});
