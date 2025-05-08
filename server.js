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
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading DB file:', err);
        return { rooms: {}, messages: {} };
    }
}

// Write to DB
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing to DB file:', err);
    }
}

// Track active users in each room
const activeRooms = {};

// Serve static files
app.use(express.static(__dirname));

// Room authentication middleware
app.use(express.json());
app.post('/auth', (req, res) => {
    const { roomName, password } = req.body;
    const db = readDB();
    
    // If room doesn't exist yet, create it with this password
    if (!db.rooms[roomName]) {
        db.rooms[roomName] = { 
            password, 
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        db.messages[roomName] = [];
        writeDB(db);
        
        // Initialize active room tracking
        if (!activeRooms[roomName]) {
            activeRooms[roomName] = new Set();
        }
        
        return res.json({ success: true, created: true });
    }
    
    // If room exists, check password
    if (db.rooms[roomName].password === password) {
        // Update last activity
        db.rooms[roomName].lastActivity = new Date().toISOString();
        writeDB(db);
        
        // Initialize active room tracking if needed
        if (!activeRooms[roomName]) {
            activeRooms[roomName] = new Set();
        }
        
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

// Get active rooms
app.get('/active-rooms', (req, res) => {
    const activeRoomsList = Object.keys(activeRooms)
        .filter(room => activeRooms[room].size > 0)
        .map(room => ({
            name: room,
            userCount: activeRooms[room].size
        }));
    
    return res.json(activeRoomsList);
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a room
    socket.on('join-room', (roomName, username) => {
        socket.join(roomName);
        socket.roomName = roomName;
        socket.username = username || socket.id;
        
        // Update active users tracking
        if (!activeRooms[roomName]) {
            activeRooms[roomName] = new Set();
        }
        activeRooms[roomName].add(socket.id);
        
        // Update last activity timestamp in DB
        const db = readDB();
        if (db.rooms[roomName]) {
            db.rooms[roomName].lastActivity = new Date().toISOString();
            writeDB(db);
        }
        
        // Broadcast to room that a new user joined
        socket.broadcast.to(roomName).emit('user-joined', {
            id: socket.id,
            username: socket.username
        });
        
        console.log(`User ${socket.id} (${socket.username}) joined room ${roomName}`);
        console.log(`Room ${roomName} now has ${activeRooms[roomName].size} active users`);
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
        
        // Update room activity
        if (db.rooms[socket.roomName]) {
            db.rooms[socket.roomName].lastActivity = new Date().toISOString();
        }
        
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
            // Notify room that user disconnected
            io.to(socket.roomName).emit('user-disconnected', socket.id);
            console.log(`User ${socket.id} (${socket.username}) disconnected from ${socket.roomName}`);
            
            // Remove from active users
            if (activeRooms[socket.roomName]) {
                activeRooms[socket.roomName].delete(socket.id);
                
                // If room is empty, clean it up
                if (activeRooms[socket.roomName].size === 0) {
                    console.log(`Room ${socket.roomName} is now empty, scheduling cleanup`);
                    
                    // Delay room cleanup by 5 minutes to allow for reconnection
                    setTimeout(() => {
                        // Check again if room is still empty
                        if (activeRooms[socket.roomName] && activeRooms[socket.roomName].size === 0) {
                            console.log(`Cleaning up empty room: ${socket.roomName}`);
                            
                            // Remove from active rooms tracking
                            delete activeRooms[socket.roomName];
                            
                            // Remove room from database
                            const db = readDB();
                            if (db.rooms[socket.roomName]) {
                                delete db.rooms[socket.roomName];
                                delete db.messages[socket.roomName];
                                writeDB(db);
                                console.log(`Room ${socket.roomName} removed from database`);
                            }
                        }
                    }, 5 * 60 * 1000); // 5 minutes delay
                }
            }
        }
    });
});

// Server health endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Room cleanup task - runs every 6 hours
setInterval(() => {
    console.log('Running scheduled room cleanup task');
    const db = readDB();
    const now = new Date();
    let roomsDeleted = 0;
    
    for (const roomName in db.rooms) {
        // Skip rooms with active users
        if (activeRooms[roomName] && activeRooms[roomName].size > 0) {
            continue;
        }
        
        // Check if room has been inactive for more than 24 hours
        const lastActivity = new Date(db.rooms[roomName].lastActivity || db.rooms[roomName].createdAt);
        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
        
        if (hoursSinceActivity > 24) {
            console.log(`Deleting inactive room: ${roomName} (inactive for ${Math.floor(hoursSinceActivity)} hours)`);
            delete db.rooms[roomName];
            delete db.messages[roomName];
            delete activeRooms[roomName];
            roomsDeleted++;
        }
    }
    
    if (roomsDeleted > 0) {
        console.log(`Deleted ${roomsDeleted} inactive rooms`);
        writeDB(db);
    } else {
        console.log('No inactive rooms to delete');
    }
}, 6 * 60 * 60 * 1000); // Every 6 hours

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Update the port configuration for Glitch.me
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server started at: ${new Date().toISOString()}`);
}); 