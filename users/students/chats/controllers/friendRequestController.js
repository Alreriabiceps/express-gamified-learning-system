const FriendRequest = require('../models/friendRequestModel');
const Student = require('../../../../users/admin/student/models/studentModels');

// Send a friend request
exports.sendRequest = async (req, res) => {
  try {
    const requester = req.user.id;
    const { studentId } = req.body;
    const recipientUser = await Student.findOne({ studentId });
    if (!recipientUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (recipientUser._id.equals(requester)) {
      return res.status(400).json({ success: false, error: 'Cannot add yourself' });
    }
    // Check for existing request or friendship
    const existing = await FriendRequest.findOne({
      $or: [
        { requester, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: requester },
      ],
      status: { $in: ['pending', 'accepted'] },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Request or friendship already exists' });
    }
    let request = await FriendRequest.create({ requester, recipient: recipientUser._id });
    request = await request.populate('requester', 'studentId firstName lastName');
    request = await request.populate('recipient', 'studentId firstName lastName');
    // Emit real-time events
    const io = req.app.get('io');
    io.to(recipientUser._id.toString()).emit('friend:requestReceived', { request });
    io.to(requester).emit('friend:requestSent', { request });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Accept a friend request
exports.acceptRequest = async (req, res) => {
  try {
    const recipient = req.user.id;
    const { requestId } = req.body;
    let request = await FriendRequest.findOne({ _id: requestId, recipient, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    request.status = 'accepted';
    await request.save();
    request = await request.populate('requester', 'studentId firstName lastName');
    request = await request.populate('recipient', 'studentId firstName lastName');
    // Emit real-time events
    const io = req.app.get('io');
    io.to(request.requester._id.toString()).emit('friend:requestAccepted', { request });
    io.to(recipient).emit('friend:requestAccepted', { request });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all friends (accepted)
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await FriendRequest.find({
      $or: [
        { requester: userId },
        { recipient: userId },
      ],
      status: 'accepted',
    }).populate('requester', 'username firstName lastName').populate('recipient', 'username firstName lastName');
    res.json({ success: true, data: friends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get pending requests (received)
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await FriendRequest.find({ recipient: userId, status: 'pending' })
      .populate('requester', 'studentId firstName lastName')
      .populate('recipient', 'studentId firstName lastName');
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove an accepted friend
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    // Find the friendship (accepted) where user is requester or recipient and the other is friendId
    let friendship = await FriendRequest.findOne({
      _id: friendId,
      status: 'accepted',
      $or: [
        { requester: userId },
        { recipient: userId },
      ],
    });
    if (!friendship) {
      return res.status(404).json({ success: false, error: 'Friendship not found' });
    }
    friendship = await friendship.populate('requester', 'studentId firstName lastName');
    friendship = await friendship.populate('recipient', 'studentId firstName lastName');
    const otherUser = friendship.requester._id.toString() === userId ? friendship.recipient._id : friendship.requester._id;
    await friendship.deleteOne();
    // Emit real-time events
    const io = req.app.get('io');
    io.to(userId).emit('friend:removed', { friendId });
    io.to(otherUser.toString()).emit('friend:removed', { friendId });
    res.json({ success: true, message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Cancel a pending friend request sent by the user
exports.cancelRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;
    let request = await FriendRequest.findOne({
      _id: requestId,
      requester: userId,
      status: 'pending',
    });
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found or not yours' });
    }
    request = await request.populate('requester', 'studentId firstName lastName');
    request = await request.populate('recipient', 'studentId firstName lastName');
    const recipient = request.recipient._id;
    await request.deleteOne();
    // Emit real-time events
    const io = req.app.get('io');
    io.to(recipient.toString()).emit('friend:requestCancelled', { requestId });
    res.json({ success: true, message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}; 