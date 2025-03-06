// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
    },
});

let onlineUsers = {}; // { socketId: { username: string, pairedWith: string | null } }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (username) => {
        onlineUsers[socket.id] = { username, pairedWith: null };
        console.log(`${username} joined the chat`);
        io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
    });

    socket.on('signal', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
        } else {
            console.warn('Signal target user not found:', data.to);
        }
    });

    socket.on('chat_message', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('chat_message', { from: onlineUsers[socket.id].username, message: data.message });
        } else {
            console.warn('Chat target user not found:', data.to);
        }
    });

    socket.on('typing', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('typing', { from: onlineUsers[socket.id].username });
        }
    });

    socket.on('file_message', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('file_message', { from: onlineUsers[socket.id].username, file: data.file, fileName: data.fileName });
        }
    });

    socket.on('end_call', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('end_call');
        }
    });

    socket.on('disconnect', () => {
        const user = onlineUsers[socket.id];
        if (user) {
            console.log(`${user.username} left the chat`);
            delete onlineUsers[socket.id];
            io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});