const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL for production)
        methods: ['GET', 'POST'],
    },
});

let onlineUsers = {}; // Track online users: { socketId: username }
let users = {}; // Store usernames with their socket IDs

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining
    socket.on('join', (username) => {
        onlineUsers[socket.id] = username;
        users[username] = socket.id;
        console.log(`${username} joined the chat`);
        io.emit('online_users', Object.values(onlineUsers)); // Send updated list to all users
    });

    // Relay signaling messages
    socket.on('signal', (data) => {
        socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Handle chat messages
    socket.on('chat_message', (data) => {
        socket.to(data.to).emit('chat_message', { from: socket.id, message: data.message });
    });

    // Handle user calling another user
    socket.on('call_user', (data) => {
        const targetSocketId = users[data.to]; // Get receiver's socket ID
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming_call', { from: data.from });
        }
    });

    // Handle call acceptance
    socket.on('accept_call', (data) => {
        const callerSocketId = users[data.to];
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_accepted', { from: data.from });
        }
    });

    // Handle call rejection
    socket.on('reject_call', (data) => {
        const callerSocketId = users[data.to];
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_rejected', { from: data.from });
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const username = onlineUsers[socket.id];
        if (username) {
            delete onlineUsers[socket.id];
            delete users[username];
            console.log(`${username} left the chat`);
            io.emit('online_users', Object.values(onlineUsers)); // Send updated list to all users
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
