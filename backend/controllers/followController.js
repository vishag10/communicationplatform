const User = require('../models/User');
const FollowRequest = require('../models/FollowRequest');

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        { $or: [{ username: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }] }
      ]
    }).select('username email profilePicture bio').limit(20);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendFollowRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.userId.toString()) return res.status(400).json({ error: 'Cannot follow yourself' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existingRequest = await FollowRequest.findOne({ from: req.userId, to: userId });
    if (existingRequest) return res.status(400).json({ error: 'Follow request already sent' });

    const followRequest = new FollowRequest({ from: req.userId, to: userId });
    await followRequest.save();
    await User.findByIdAndUpdate(req.userId, { $addToSet: { following: userId } });

    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const targetSocketId = userSockets?.get(userId);
    
    if (targetSocketId) {
      const sender = await User.findById(req.userId).select('username email profilePicture');
      io.to(targetSocketId).emit('follow-request-received', {
        request: { _id: followRequest._id, from: sender }
      });
    }

    res.json({ message: 'Follow request sent', followRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptFollowRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest || followRequest.to.toString() !== req.userId.toString()) {
      return res.status(404).json({ error: 'Follow request not found' });
    }

    followRequest.status = 'accepted';
    await followRequest.save();
    await User.findByIdAndUpdate(req.userId, { $addToSet: { followers: followRequest.from, following: followRequest.from } });
    await User.findByIdAndUpdate(followRequest.from, { $addToSet: { followers: req.userId } });

    res.json({ message: 'Follow request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFollowRequests = async (req, res) => {
  try {
    const requests = await FollowRequest.find({ to: req.userId, status: 'pending' })
      .populate('from', 'username email profilePicture');
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMutualFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const mutualFollowers = user.followers.filter(followerId => user.following.includes(followerId));
    const users = await User.find({ _id: { $in: mutualFollowers } })
      .select('username email profilePicture isOnline lastSeen');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unfollow = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.userId, { $pull: { following: userId, followers: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { followers: req.userId, following: req.userId } });
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
