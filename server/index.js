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

// Khởi tạo Matchmaker
const matchmaker = new Matchmaker(io);

io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    socket.on('joinQueue', (data) => {
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

// Kết nối MongoDB trước, sau đó mới khởi động server
mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fairytale_clash', {
        serverSelectionTimeoutMS: 5000,  // Báo lỗi sau 5s thay vì 10s
        bufferCommands: false            // Không buffer – lỗi ngay nếu chưa connect
    })
    .then(() => {
        console.log('🍃 Connected to MongoDB');

        // Chỉ đăng ký Auth routes sau khi DB sẵn sàng
        const authRoutes = require('./routes/auth');
        app.use('/api/auth', authRoutes);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Không thể kết nối MongoDB:', err.message);
        console.error('👉 Hãy chắc chắn MongoDB đang chạy: net start MongoDB');
        process.exit(1);
    });
