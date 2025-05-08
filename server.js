const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Simple file-based JSON database
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        rooms: {},
        messages: {}
    }));
}

// Read DB
function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Write to DB
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Serve static files
app.use(express.static(__dirname));

// Room authentication middleware
app.use(express.json());
app.post('/auth', (req, res) => {
    const { roomName, password } = req.body;
    const db = readDB();
    
    // If room doesn't exist yet, create it with this password
    if (!db.rooms[roomName]) {
        db.rooms[roomName] = { password, createdAt: new Date().toISOString() };
        db.messages[roomName] = [];
        writeDB(db);
        return res.json({ success: true, created: true });
    }
    
    // If room exists, check password
    if (db.rooms[roomName].password === password) {
        return res.json({ success: true, created: false });
    }
    
    // Wrong password
    return res.json({ success: false, message: 'Invalid room password' });
});

// Get room messages
app.get('/messages/:room', (req, res) => {
    const { room } = req.params;
    const db = readDB();
    
    if (!db.messages[room]) {
        return res.json([]);
    }
    
    return res.json(db.messages[room]);
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a room
    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        socket.roomName = roomName;
        socket.broadcast.to(roomName).emit('user-joined', socket.id);
        console.log(`User ${socket.id} joined room ${roomName}`);
    });
    
    // Handle chat messages
    socket.on('send-message', (message) => {
        if (!socket.roomName) return;
        
        const db = readDB();
        const newMessage = {
            id: Date.now().toString(),
            sender: message.sender,
            text: message.text,
            timestamp: new Date().toISOString()
        };
        
        if (!db.messages[socket.roomName]) {
            db.messages[socket.roomName] = [];
        }
        
        db.messages[socket.roomName].push(newMessage);
        writeDB(db);
        
        // Broadcast message to room
        io.to(socket.roomName).emit('new-message', newMessage);
    });
    
    // WebRTC Signaling
    socket.on('offer', (offer, targetId) => {
        socket.to(targetId).emit('offer', offer, socket.id);
    });
    
    socket.on('answer', (answer, targetId) => {
        socket.to(targetId).emit('answer', answer, socket.id);
    });
    
    socket.on('ice-candidate', (candidate, targetId) => {
        socket.to(targetId).emit('ice-candidate', candidate, socket.id);
    });
    
    // Notify when user is ready for connections (has granted media permissions)
    socket.on('user-ready', () => {
        if (!socket.roomName) return;
        socket.broadcast.to(socket.roomName).emit('user-ready', socket.id);
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
        if (socket.roomName) {
            io.to(socket.roomName).emit('user-disconnected', socket.id);
            console.log(`User ${socket.id} disconnected from ${socket.roomName}`);
        }
    });
});

// Update the port configuration for Glitch.me
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
}); 