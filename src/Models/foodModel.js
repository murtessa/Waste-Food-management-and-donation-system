const mongoose = require('mongoose');
//  const validator = require('validator');

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      defualt: 4,
    },

    quantity: {
      type: Number,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor i must be needed '],
    }, // Reference to the Donor (User)

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }, // Reference to the Recipient (User)
    foodImage: {
      type: String,
    },

    status: {
      type: String,
      enum: ['Approved', 'Pending', 'Rejected'],
      default: 'Pending',
    },
    // Add other fields as needed
  },
  { timestamps: true }
);

foodSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'donor',
    select: '-__v -updateddAt -role -foodPreferences',
  });

  next();
});

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;
