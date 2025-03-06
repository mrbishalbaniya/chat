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

let users = []; // Track connected users

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add user to the list
    users.push(socket.id);

    // Pair users
    if (users.length >= 2) {
        const user1 = users.shift();
        const user2 = users.shift();

        // Notify both users that they are paired
        io.to(user1).emit('paired', user2);
        io.to(user2).emit('paired', user1);
    }

    // Relay signaling messages
    socket.on('signal', (data) => {
        console.log('Relaying signal from', socket.id, 'to', data.to);
        socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Handle chat messages
    socket.on('chat_message', (data) => {
        console.log('Relaying chat message from', socket.id, 'to', data.to);
        socket.to(data.to).emit('chat_message', { from: socket.id, message: data.message });
    });

    // Handle custom disconnect event
    socket.on('user_disconnect', () => {
        console.log('User manually disconnected:', socket.id);
        users = users.filter((user) => user !== socket.id);
        socket.broadcast.emit('partner_disconnected'); // Notify the partner
    });

    // Handle built-in disconnect event
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users = users.filter((user) => user !== socket.id);
        socket.broadcast.emit('partner_disconnected'); // Notify the partner
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});