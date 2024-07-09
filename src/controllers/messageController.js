const catchAsync = require('./../util/catchError');
const Message = require('./../Models/Message');

exports.getMessages = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .populate('sender', 'fullName email')
      .populate('recipient', 'fullName email');

    res.status(200).json({
      status: 'success',
      data: {
        messages,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(400).json({
      status: 'fail',
      message: 'Failed to fetch messages',
    });
  }
});

exports.getUnreadMessages = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch unread messages for the logged-in user
    const unreadMessages = await Message.find({
      recipient: userId,
      read: false,
    }).populate('sender', 'fullName email');

    // Count of unread messages
    const unreadMessagesCount = unreadMessages.length;

    res.status(200).json({
      status: 'success',
      data: {
        unreadMessagesCount,
        unreadMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(400).json({
      status: 'fail',
      message: 'Failed to fetch unread messages',
    });
  }
});

exports.markMessagesAsRead = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Update all unread messages for the logged-in user to mark them as read
    await Message.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(400).json({
      status: 'fail',
      message: 'Failed to mark messages as read',
    });
  }
});
