const User = require('./../Models/userModel');
const AppError = require('./../util/appError');
const catchAsync = require('./../util/catchError');

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  multfilter() {
    const searchQuery = (this.queryString.q || '').toLowerCase();

    console.log('Search Query:', searchQuery); // Log the search query

    if (typeof searchQuery === 'string' && searchQuery.length > 0) {
      const regexSearch = {
        $or: [
          { fullName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { role: { $regex: searchQuery, $options: 'i' } },
        ],
      };

      this.query = this.query.find(regexSearch);
    }

    // console.log('Query after applying regex search:', this.query); // Log the query
    return this;
  }

  filter() {
    const qeuryObj = { ...this.queryString };
    const excludeFields = ['pages', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete qeuryObj[el]);

    // 1B Advanced Filtering
    let queryStr = JSON.stringify(qeuryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log(JSON.parse(queryStr));

    this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-publishedAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    const pages = this.queryString.pages * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (pages - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

// module.exports = APIFeatures;

exports.getAllUsers = catchAsync(async (req, res, next) => {
  try {
    const features = new APIFeatures(User.find(), req.query).multfilter();

    const users = await features.query;

    if (!users) {
      return next(new AppError('No user is found ', 404));
    }

    res.status(200).json({
      status: 'success',
      result: users.length,

      users,
    });
    next();
  } catch (err) {
    console.error('Error fetching foods:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
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
  // 1) Check if user is trying to update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updatePassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'fullName',
    'email',
    'phone',
    'address',
    'userPhoto'
  );

  // 3) Handle file upload for userPhoto if it exists in req.file
  if (req.file) {
    filteredBody.userPhoto = req.file.filename;
  }

  // 4) Update user document
  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // 5) Send response
  res.status(200).json({
    status: 'success',
    message: 'Your profile is updated successfully!',
    data: {
      user: updateUser,
    },
  });
});

// Disable a user
exports.disableUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Enable a disabled user
exports.enableUser = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, active: false },
    { active: true },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});
