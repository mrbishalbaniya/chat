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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining
    socket.on('join', (username) => {
        onlineUsers[socket.id] = username;
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

    // Handle typing indicators
    socket.on('typing', (data) => {
        socket.to(data.to).emit('typing', { from: socket.id });
    });

    // Handle file messages
    socket.on('file_message', (data) => {
        socket.to(data.to).emit('file_message', { from: socket.id, file: data.file, fileName: data.fileName });
    });

    // Handle end call
    socket.on('end_call', (data) => {
        socket.to(data.to).emit('end_call');
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const username = onlineUsers[socket.id];
        if (username) {
            delete onlineUsers[socket.id];
            console.log(`${username} left the chat`);
            io.emit('online_users', Object.values(onlineUsers)); // Send updated list to all users
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});