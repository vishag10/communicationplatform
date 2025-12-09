const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const userSockets = new Map();
const typingUsers = new Map();

const initializeSocket = (io, app) => {
  app.set('io', io);
  app.set('userSockets', userSockets);
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    userSockets.set(socket.userId, socket.id);
    
    await User.findByIdAndUpdate(socket.userId, { isOnline: true });
    
    socket.broadcast.emit('user-online', { userId: socket.userId });

    socket.on('send-message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        const sender = await User.findById(socket.userId);
        if (!sender.isMutualFollower(receiverId)) {
          return socket.emit('error', { message: 'Can only message mutual followers' });
        }

        const message = new Message({
          sender: socket.userId,
          receiver: receiverId,
          content
        });
        await message.save();
        
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('receiver', 'username profilePicture');

        socket.emit('message-sent', populatedMessage);
        
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive-message', populatedMessage);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('typing-start', (data) => {
      const { receiverId } = data;
      typingUsers.set(`${socket.userId}-${receiverId}`, true);
      
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-typing', { userId: socket.userId });
      }
    });

    socket.on('typing-stop', (data) => {
      const { receiverId } = data;
      typingUsers.delete(`${socket.userId}-${receiverId}`);
      
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-stopped-typing', { userId: socket.userId });
      }
    });

    socket.on('call-user', (data) => {
      const { to, offer, callType } = data;
      const receiverSocketId = userSockets.get(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incoming-call', {
          from: socket.userId,
          offer,
          callType,
          caller: {
            id: socket.user._id,
            username: socket.user.username,
            profilePicture: socket.user.profilePicture
          }
        });
      }
    });

    socket.on('call-answer', (data) => {
      const { to, answer } = data;
      const callerSocketId = userSockets.get(to);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-answered', {
          from: socket.userId,
          answer
        });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      const targetSocketId = userSockets.get(to);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          from: socket.userId,
          candidate
        });
      }
    });

    socket.on('call-reject', (data) => {
      const { to } = data;
      const callerSocketId = userSockets.get(to);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-rejected', {
          from: socket.userId
        });
      }
    });

    socket.on('call-end', (data) => {
      const { to } = data;
      const targetSocketId = userSockets.get(to);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-ended', {
          from: socket.userId
        });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      userSockets.delete(socket.userId);
      
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });
      
      socket.broadcast.emit('user-offline', {
        userId: socket.userId,
        lastSeen: new Date()
      });
    });
  });
};

module.exports = initializeSocket;
