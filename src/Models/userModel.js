const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'First and Last Name is must be needed'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please password is must be needed  '],
      select: false,
    },

    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your Password'],
      validate: {
        //this only work on saves or on create
        validator: function (el) {
          return el === this.password;
        },
        message: 'please your password is not the same ... ',
      },
    },
    phone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['donor', 'NGO', 'admin', 'delivery'],
      required: true,
      default: 'donor',
    },

    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordExpireDate: Date,

    userPhoto: String,
    // Additional fields based on user roles
    organizationName: { type: String }, // for donors, qualityControl, and analytics roles
    foodPreferences: [{ type: String }], // for recipient role
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  // Only run this function if the password id modified

  if (!this.isModified('password')) return next();
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // Delete the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this poins to the current query

  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordExpireDate = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
