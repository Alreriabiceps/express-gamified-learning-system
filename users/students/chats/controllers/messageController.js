const Message = require('../models/messageModel');
const Student = require('../../../../users/admin/student/models/studentModels');

// Get chat history with a friend
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    // Only fetch messages between these two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId },
      ]
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'studentId firstName lastName')
      .populate('recipient', 'studentId firstName lastName');
    
    // Convert to frontend-compatible format
    const messagesForFrontend = messages.map(message => ({
      ...message.toObject(),
      text: message.content, // Map content to text for frontend
      createdAt: message.timestamp, // Map timestamp to createdAt for frontend
    }));
    
    res.json({ success: true, data: messagesForFrontend });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const { recipientId, text, content } = req.body;
    const messageText = text || content; // Support both field names
    if (!recipientId || !messageText) {
      return res.status(400).json({ success: false, error: 'Recipient and message text required' });
    }
    let message = await Message.create({ sender, recipient: recipientId, content: messageText, status: 'sent' });
    message = await message.populate('sender', 'studentId firstName lastName');
    message = await message.populate('recipient', 'studentId firstName lastName');
    
    // Convert to frontend-compatible format
    const messageForFrontend = {
      ...message.toObject(),
      text: message.content, // Map content to text for frontend
      createdAt: message.timestamp, // Map timestamp to createdAt for frontend
    };
    
    // Emit real-time event to recipient
    const io = req.app.get('io');
    io.to(recipientId).emit('chat:message', { message: messageForFrontend });
    res.status(201).json({ success: true, data: messageForFrontend });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark a message as delivered
exports.markDelivered = async (messageId, io) => {
  try {
    let message = await Message.findByIdAndUpdate(
      messageId,
      { status: 'delivered' },
      { new: true }
    ).populate('sender', 'studentId firstName lastName').populate('recipient', 'studentId firstName lastName');
    if (message) {
      io.to(message.sender._id.toString()).emit('message:delivered', { message });
    }
  } catch (err) {
    console.error('Error marking message as delivered:', err);
  }
};

// Mark messages as read
exports.markRead = async (userId, friendId, io) => {
  try {
    // Find all messages sent to userId by friendId that are not yet read
    const messages = await Message.find({
      sender: friendId,
      recipient: userId,
      status: { $ne: 'read' }
    });
    const messageIds = messages.map(m => m._id);
    if (messageIds.length > 0) {
      await Message.updateMany({ _id: { $in: messageIds } }, { status: 'read' });
      // Notify sender(s) of read status
      messages.forEach(msg => {
        io.to(msg.sender.toString()).emit('message:read', { messageId: msg._id, recipient: userId });
      });
    }
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
};

// Clean up messages older than 3 days
exports.cleanupOldMessages = async () => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const result = await Message.deleteMany({
      timestamp: { $lt: threeDaysAgo }
    });
    
    console.log(`🧹 Message cleanup completed: ${result.deletedCount} messages older than 3 days deleted`);
    return result.deletedCount;
  } catch (err) {
    console.error('❌ Error during message cleanup:', err);
    return 0;
  }
}; 