const GameRoom = require('./GameRoom');

class Matchmaker {
    constructor(io) {
        this.io = io;
        this.queue = []; // Array of { socket, userId, deck }
        this.rooms = new Map(); // roomId -> GameRoom instance
    }

    addToQueue(socket, data) {
        // Kiểm tra xem đã có trong hàng chờ chưa
        if (this.queue.find(p => p.socket.id === socket.id)) return;

        console.log(`🔍 Player joining queue: ${socket.id}`);
        this.queue.push({ socket, ...data });

        this.checkForMatch();
    }

    removeFromQueue(socketId) {
        this.queue = this.queue.filter(p => p.socket.id !== socketId);
    }

    checkForMatch() {
        if (this.queue.length >= 1) {
            const player1 = this.queue.shift();
            
            // Nếu không có người thứ 2, tạo một Bot giả lập
            const player2 = this.queue.length >= 1 ? this.queue.shift() : {
                socket: { id: 'bot_opponent', join: () => {}, emit: () => {} },
                userId: 'bot_fairytale',
                deck: []
            };

            this.createMatch(player1, player2);
        }
    }

    createMatch(p1, p2) {
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`⚔️ Match created: ${roomId} between ${p1.socket.id} and ${p2.socket.id}`);

        p1.socket.join(roomId);
        p2.socket.join(roomId);

        const newRoom = new GameRoom(this.io, roomId, p1, p2);
        this.rooms.set(roomId, newRoom);

        // Thông báo cho người chơi
        this.io.to(roomId).emit('matchFound', {
            roomId,
            opponent: "Opponent" // Sau này lấy từ DB
        });

        newRoom.start();
    }
}

module.exports = Matchmaker;
