require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Matchmaker = require('./game/Matchmaker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Cấu hình lại cho production sau
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Kết nối MongoDB (Bắt lỗi gọn nhẹ để chạy Offline Mode)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fairytale_clash')
  .then(() => console.log('🍃 Connected to MongoDB'))
  .catch(() => console.log('⚠️ Không tìm thấy MongoDB cục bộ (Bỏ qua và dùng Offline Mode)'));

// Khởi tạo Matchmaker
const matchmaker = new Matchmaker(io);

io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    socket.on('joinQueue', (data) => {
        // data: { userId, deck }
        matchmaker.addToQueue(socket, data);
    });

    socket.on('leaveQueue', () => {
        matchmaker.removeFromQueue(socket.id);
    });

    socket.on('disconnect', () => {
        console.log(`👤 User disconnected: ${socket.id}`);
        matchmaker.removeFromQueue(socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
