const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Room management
const rooms = new Map();

// Helper function to get users in a room
const getUsersInRoom = (roomId) => {
  const room = rooms.get(roomId);
  return room ? Array.from(room.users.values()) : [];
};

// Room cleanup handler - delete empty rooms after 5 minutes
const scheduleRoomDeletion = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clear any existing timeout
  if (room.deletionTimeout) {
    clearTimeout(room.deletionTimeout);
  }

  // Schedule deletion after 5 minutes if room is empty
  if (room.users.size === 0) {
    room.deletionTimeout = setTimeout(() => {
      if (rooms.has(roomId) && rooms.get(roomId).users.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted due to inactivity`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room
  socket.on('join-room', ({ roomId, username, password }) => {
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        password,
        users: new Map(),
        messages: [],
        createdAt: Date.now(),
        deletionTimeout: null
      });
    }

    const room = rooms.get(roomId);

    // Verify password
    if (room.password !== password) {
      socket.emit('room-error', { message: 'Incorrect password' });
      return;
    }

    // Check room capacity (10 users max)
    if (room.users.size >= 10) {
      socket.emit('room-error', { message: 'Room is full (10 users maximum)' });
      return;
    }

    // Add user to room
    room.users.set(socket.id, {
      id: socket.id,
      username,
      isMuted: false,
      isVideoOn: false,
      isScreenSharing: false
    });

    // Join the socket room
    socket.join(roomId);
    
    // Clear any deletion timeout since room is now active
    if (room.deletionTimeout) {
      clearTimeout(room.deletionTimeout);
      room.deletionTimeout = null;
    }

    // Send previous messages to the newly joined user
    socket.emit('chat-history', room.messages);

    // Notify the user they've joined successfully
    socket.emit('room-joined', {
      roomId,
      users: getUsersInRoom(roomId)
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      user: room.users.get(socket.id),
      users: getUsersInRoom(roomId)
    });

    // Add system message for user joining
    const joinMessage = {
      id: Date.now(),
      sender: 'system',
      content: `${username} has joined the room`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    room.messages.push(joinMessage);
    io.to(roomId).emit('chat-message', joinMessage);

    console.log(`User ${username} joined room ${roomId}`);
  });

  // Handle chat messages
  socket.on('send-message', ({ roomId, content, type = 'text' }) => {
    const room = rooms.get(roomId);
    if (!room || !room.users.has(socket.id)) return;

    const user = room.users.get(socket.id);
    
    const message = {
      id: Date.now(),
      sender: user.username,
      senderId: socket.id,
      content,
      timestamp: new Date().toISOString(),
      type
    };
    
    // Store message history (limit to 100 most recent messages)
    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift();
    }
    
    // Broadcast to all users in the room
    io.to(roomId).emit('chat-message', message);
  });

  // Handle WebRTC signaling
  socket.on('signal', ({ userId, signal }) => {
    io.to(userId).emit('signal', {
      userId: socket.id,
      signal
    });
  });

  // Media status updates
  socket.on('media-status', ({ roomId, status }) => {
    const room = rooms.get(roomId);
    if (!room || !room.users.has(socket.id)) return;

    const user = room.users.get(socket.id);
    
    if (status.hasOwnProperty('isMuted')) {
      user.isMuted = status.isMuted;
    }
    
    if (status.hasOwnProperty('isVideoOn')) {
      user.isVideoOn = status.isVideoOn;
    }
    
    if (status.hasOwnProperty('isScreenSharing')) {
      user.isScreenSharing = status.isScreenSharing;
    }

    // Broadcast updated user status to room
    io.to(roomId).emit('user-updated', {
      user,
      users: getUsersInRoom(roomId)
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and remove user from all rooms they were in
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        // Add system message for user leaving
        const leaveMessage = {
          id: Date.now(),
          sender: 'system',
          content: `${user.username} has left the room`,
          timestamp: new Date().toISOString(),
          type: 'system'
        };
        
        room.messages.push(leaveMessage);
        io.to(roomId).emit('chat-message', leaveMessage);
        
        // Notify others in the room
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          users: getUsersInRoom(roomId)
        });
        
        console.log(`User ${user.username} left room ${roomId}`);
        
        // Schedule room deletion if empty
        if (room.users.size === 0) {
          scheduleRoomDeletion(roomId);
        }
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 