const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins (replace with your frontend URL in production)
        methods: ['GET', 'POST'],
    },
});

let onlineUsers = {};  // Track connected users { socketId: username }
let waitingUser = null; // Store a single waiting user for pairing

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining
    socket.on('join', (username) => {
        onlineUsers[socket.id] = username;
        console.log(`${username} joined the chat`);

        // Auto pair users
        if (waitingUser) {
            // Pair current user with the waiting user
            io.to(socket.id).emit('paired', waitingUser);
            io.to(waitingUser).emit('paired', socket.id);
            waitingUser = null; // Reset waiting user
        } else {
            waitingUser = socket.id; // Store this user as waiting
        }

        io.emit('online_users', Object.values(onlineUsers)); // Send updated list to all users
    });

    // Relay signaling messages
    socket.on('signal', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
        } else {
            console.warn('Signal target user not found:', data.to);
        }
    });

    // Handle chat messages
    socket.on('chat_message', (data) => {
        if (onlineUsers[data.to]) {
            socket.to(data.to).emit('chat_message', { from: socket.id, message: data.message });
        } else {
            console.warn('Chat target user not found:', data.to);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const username = onlineUsers[socket.id];
        if (username) {
            delete onlineUsers[socket.id];
            console.log(`${username} left the chat`);

            if (waitingUser === socket.id) {
                waitingUser = null; // Reset waiting user if they disconnect
            }

            io.emit('online_users', Object.values(onlineUsers)); // Send updated list to all users
        }
    });
});
socket.on("call_user", (data) => {
    io.to(users[data.to]).emit("incoming_call", { from: data.from });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
