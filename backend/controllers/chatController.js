const Message = require('../models/Message');
const User = require('../models/User');

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const currentUser = await User.findById(req.userId);
    if (!currentUser.isMutualFollower(userId)) {
      return res.status(403).json({ error: 'Can only chat with mutual followers' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture');

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: req.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChatList = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const mutualFollowers = user.followers.filter(followerId => user.following.includes(followerId));

    const chatList = await Promise.all(
      mutualFollowers.map(async (userId) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: req.userId, receiver: userId },
            { sender: userId, receiver: req.userId }
          ]
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          sender: userId,
          receiver: req.userId,
          isRead: false
        });

        const userInfo = await User.findById(userId).select('username profilePicture isOnline lastSeen');

        return { user: userInfo, lastMessage, unreadCount };
      })
    );

    res.json({ chatList: chatList.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || 0;
      return bTime - aTime;
    }) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
