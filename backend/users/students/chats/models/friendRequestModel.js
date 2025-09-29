const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendRequestSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema); 