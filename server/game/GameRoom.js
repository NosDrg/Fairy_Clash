const Troop = require('./Troop');
const Building = require('./Building');
const Card = require('../models/Card');

const DEFAULT_CARDS = [
    { name: 'Snow White', cost: 3, hp: 1200, damage: 150, attackSpeed: 1.2, range: 1.5, moveSpeed: 4, type: 'Troop' },
    { name: 'Deep Woods Witch', cost: 4, hp: 500, damage: 120, attackSpeed: 1.5, range: 6, moveSpeed: 4, type: 'Troop', isAoE: true, aoeRadius: 2.5 },
    { name: 'Royal Knight', cost: 5, hp: 2000, damage: 200, attackSpeed: 1.5, range: 1.5, moveSpeed: 3, type: 'Troop' },
    { name: 'Dwarf Swarm', cost: 3, hp: 250, damage: 30, attackSpeed: 0.6, range: 1.2, moveSpeed: 8, type: 'TroopGroup', spawnCount: 4 },
    { name: 'Miner Dwarf', cost: 2, hp: 800, damage: 100, attackSpeed: 0.8, range: 1.2, moveSpeed: 6, type: 'Troop' },
    { name: 'Huntsman', cost: 4, hp: 900, damage: 180, attackSpeed: 1.5, range: 5, moveSpeed: 3, type: 'Troop' },
    { name: 'Fairy Bluebird', cost: 1, hp: 300, damage: 40, attackSpeed: 0.5, range: 3, moveSpeed: 8, type: 'Troop' },
    { name: 'Dwarf Hut', cost: 5, hp: 1500, damage: 0, attackSpeed: 0, range: 0, spawnRate: 8, type: 'Building' },
    { name: 'Poison Apple', cost: 4, damage: 15, effect: 'poison_area', radius: 12, duration: 15, type: 'Spell' },
    { name: 'Miner Bomb', cost: 2, damage: 50, effect: 'pushback', radius: 15, type: 'Spell' },
    { name: 'The King', cost: 7, hp: 3500, damage: 400, attackSpeed: 2.5, range: 1.5, moveSpeed: 1.5, type: 'Troop', isAoE: true, aoeRadius: 2, targetPreference: 'building' },
    { name: 'Tin Woodman', cost: 6, hp: 3000, damage: 180, attackSpeed: 1.8, range: 1.5, moveSpeed: 2.5, type: 'Troop' },
    { name: 'Scarecrow', cost: 2, hp: 1500, damage: 0, attackSpeed: 0, range: 0, moveSpeed: 0, type: 'Troop' },
    { name: 'Oz Tornado', cost: 4, damage: 150, effect: 'tornado', radius: 20, type: 'Spell' },
    { name: 'Cowardly Lion', cost: 4, hp: 1200, damage: 160, attackSpeed: 0.9, range: 1.5, moveSpeed: 6, type: 'Troop' },
    { name: 'Wicked Witch', cost: 5, hp: 900, damage: 150, attackSpeed: 1.5, range: 5, moveSpeed: 3, type: 'Troop', isAoE: true, aoeRadius: 2.5 },
    { name: 'Glinda\'s Light', cost: 3, damage: -300, effect: 'heal', radius: 15, type: 'Spell' }
];

class GameRoom {
    constructor(io, roomId, p1, p2) {
        this.io = io;
        this.roomId = roomId;
        this.players = {
            [p1.socket.id]: { socket: p1.socket, userData: p1.userData || {}, side: 'bottom', fairyDust: 5 },
            [p2.socket.id]: { socket: p2.socket, userData: p2.userData || {}, side: 'top', fairyDust: 5 }
        };
        
        const towerStats = (type) => ({ 
            name: type, 
            hp: type === 'king' ? 4000 : 2500, 
            damage: 100, 
            attackSpeed: 1.0, 
            range: 7 
        });

        this.gameState = {
            timeLeft: 180,
            entities: [], 
            towers: [
                new Building('p1_main', null, towerStats('king'), 50, 90, 'bottom'),
                new Building('p1_left', null, towerStats('princess'), 20, 80, 'bottom'),
                new Building('p1_right', null, towerStats('princess'), 80, 80, 'bottom'),
                new Building('p2_main', null, towerStats('king'), 50, 10, 'top'),
                new Building('p2_left', null, towerStats('princess'), 20, 20, 'top'),
                new Building('p2_right', null, towerStats('princess'), 80, 20, 'top')
            ],
            activeSpells: [],
            status: 'waiting'
        };
        this.tickRate = 100;
        this.gameInterval = null;
        this.cards = DEFAULT_CARDS; // Sử dụng mặc định ngay từ đầu
    }

    async start() {
        try {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const dbCards = await Card.find({}).maxTimeMS(2000); // Thử lấy từ DB trong 2s
                if (dbCards && dbCards.length > 0) {
                    const dbCardsMapped = dbCards.map(c => {
                        let card = c.toObject ? c.toObject() : c;
                        if (card.range > 20) card.range = card.range / 100;
                        if (card.moveSpeed > 20) card.moveSpeed = card.moveSpeed / 100;
                        return card;
                    });
                    this.cards = [...dbCardsMapped];
                    DEFAULT_CARDS.forEach(defaultCard => {
                        if (!this.cards.find(c => c.name === defaultCard.name)) {
                            this.cards.push(defaultCard);
                        }
                    });
                }
            }
        } catch (e) {
            console.log('⚠️ Dùng dữ liệu lính dự phòng (Offline Mode)');
        }
        
        this.gameState.status = 'playing';

        Object.keys(this.players).forEach(socketId => {
            const socket = this.players[socketId].socket;
            if (typeof socket.on === 'function') {
                socket.on('spawnUnit', (data) => this.handleSpawnUnit(socketId, data));
            }
        });

        this.gameInterval = setInterval(() => this.update(), this.tickRate);
        this.dustTimer = 0;

        // Giả lập sinh lính tự động để trực quan hóa lúc test
        setTimeout(() => {
            const p1Id = Object.keys(this.players)[0];
            const p2Id = Object.keys(this.players)[1];
            
            // Giả lập tặng thêm mana để mua lúc đầu cho thoải mái
            if (p1Id) this.players[p1Id].fairyDust += 10;
            if (p2Id) this.players[p2Id].fairyDust += 10;

            if (p1Id) this.handleSpawnUnit(p1Id, { cardName: 'Dwarf Hut', x: 20, y: 70 });
            if (p2Id) this.handleSpawnUnit(p2Id, { cardName: 'Snow White', x: 80, y: 30 });
        }, 1500);
    }

    handleSpawnUnit(socketId, { cardName, x, y }) {
        const player = this.players[socketId];
        const cardStats = this.cards.find(c => c.name === cardName);
        if (!cardStats || player.fairyDust < cardStats.cost) return;

        player.fairyDust -= cardStats.cost;
        const id = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        if (cardStats.type === 'Spell') {
            const enemySide = player.side === 'bottom' ? 'top' : 'bottom';
            const damage = cardStats.damage || 200;
            
            if (cardStats.effect === 'pushback') {
                const radius = cardStats.radius || 15;
                this.gameState.entities.forEach(e => {
                    if (e.side === enemySide) {
                        const dx = e.x - x;
                        const dy = e.y - y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= radius) {
                            e.takeDamage(damage);
                            const pushDist = 8; // đẩy lùi 8 đơn vị
                            if (dist > 0.1) {
                                e.x += (dx / dist) * pushDist;
                                e.y += (dy / dist) * pushDist;
                            } else {
                                e.y += (enemySide === 'top' ? -pushDist : pushDist);
                            }
                            // Giới hạn trong bản đồ
                            e.x = Math.max(0, Math.min(100, e.x));
                            e.y = Math.max(0, Math.min(100, e.y));
                        }
                    }
                });
            } else if (cardStats.effect === 'tornado') {
                const radius = cardStats.radius || 20;
                this.gameState.entities.forEach(e => {
                    if (e.side === enemySide) {
                        const dist = Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2));
                        if (dist <= radius) {
                            e.takeDamage(damage);
                            e.applyStun(4000); // Choáng 4 giây do bị cuốn lên cao
                        }
                    }
                });
            } else if (cardStats.effect === 'heal') {
                const radius = cardStats.radius || 15;
                this.gameState.entities.forEach(e => {
                    if (e.side === player.side) {
                        const dist = Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2));
                        if (dist <= radius) {
                            e.hp = Math.min(e.maxHp, e.hp - damage); // Heal
                        }
                    }
                });
                this.gameState.towers.forEach(t => {
                    if (t.side === player.side) {
                        const dist = Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2));
                        if (dist <= radius) {
                            t.hp = Math.min(t.maxHp, t.hp - damage);
                        }
                    }
                });
            } else if (cardStats.effect === 'poison_area') {
                this.gameState.activeSpells.push({
                    id: `spell_${Date.now()}`,
                    name: 'Poison Apple',
                    x: x,
                    y: y,
                    radius: cardStats.radius || 12,
                    damage: cardStats.damage || 15,
                    duration: (cardStats.duration || 15) * 1000, // đổi sang ms
                    startTime: Date.now(),
                    side: player.side
                });
            } else {
                // Toàn bản đồ (hiệu ứng cũ nếu còn các spell khác)
                this.gameState.entities.forEach(e => {
                    if (e.side === enemySide) {
                        e.takeDamage(damage);
                    }
                });
                this.gameState.towers.forEach(t => {
                    if (t.side === enemySide) {
                        t.hp -= damage;
                        if (t.applyStun) t.applyStun(3000);
                        if (t.applySlow) t.applySlow(6000);
                    }
                });
            }
            return;
        }

        let newEntity;
        if (cardStats.type === 'Building') {
            newEntity = new Building(id, socketId, cardStats, x, y, player.side);
            this.gameState.entities.push(newEntity);
        } else if (cardStats.type === 'TroopGroup') {
            const count = cardStats.spawnCount || 4;
            for (let i = 0; i < count; i++) {
                const groupId = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const offsetX = (Math.random() - 0.5) * 4;
                const offsetY = (Math.random() - 0.5) * 4;
                this.gameState.entities.push(new Troop(groupId, socketId, cardStats, x + offsetX, y + offsetY, player.side));
            }
        } else {
            newEntity = new Troop(id, socketId, cardStats, x, y, player.side);
            this.gameState.entities.push(newEntity);
        }
    }

    update() {
        if (this.gameState.timeLeft > 0) {
            this.gameState.timeLeft -= (this.tickRate / 1000);
            
            // Cập nhật các spell đang hiệu lực
            this.gameState.activeSpells = this.gameState.activeSpells.filter(spell => {
                spell.duration -= this.tickRate;
                
                // Gây sát thương mỗi tick cho kẻ địch trong vùng
                const enemySide = spell.side === 'bottom' ? 'top' : 'bottom';
                this.gameState.entities.forEach(e => {
                    if (e.side === enemySide) {
                        const dist = Math.sqrt(Math.pow(e.x - spell.x, 2) + Math.pow(e.y - spell.y, 2));
                        if (dist <= spell.radius) {
                            e.takeDamage(spell.damage);
                            e.applySlow(1000); // Làm chậm nhẹ khi đi qua vùng độc
                        }
                    }
                });
                
                return spell.duration > 0;
            });

            // Cập nhật bụi tiên động (x2 ở 60s cuối)
            const dustIntervalTime = this.gameState.timeLeft <= 60 ? 1 : 2;
            this.dustTimer += (this.tickRate / 1000);
            if (this.dustTimer >= dustIntervalTime) {
                this.dustTimer = 0;
                for (let id in this.players) {
                    if (this.players[id].fairyDust < 10) this.players[id].fairyDust += 1;
                }
            }
            
            let newEntities = [];
            let attacks = [];
            // Cập nhật lính
            this.gameState.entities.forEach(e => {
                const result = e.update(this.gameState, this.tickRate);
                if (result) {
                    if (result.action === 'spawn') {
                        const spawnStats = this.cards.find(c => c.name === 'Miner Dwarf');
                        if (spawnStats) {
                            const id = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            newEntities.push(new Troop(id, result.ownerId, spawnStats, result.x, result.y + 1, result.side));
                        }
                    } else if (result.action === 'attack') {
                        attacks.push({ attackerId: e.id, targetId: result.targetId, x1: result.startX, y1: result.startY, x2: result.targetX, y2: result.targetY });
                    }
                }
            });
            
            if (newEntities.length > 0) {
                this.gameState.entities.push(...newEntities);
            }
            
            this.gameState.entities = this.gameState.entities.filter(e => e.hp > 0);

            // Cập nhật tháp
            this.gameState.towers.forEach(t => {
                const result = t.update(this.gameState, this.tickRate);
                if (result && result.action === 'attack') {
                    attacks.push({ attackerId: t.id, targetId: result.targetId, x1: result.startX, y1: result.startY, x2: result.targetX, y2: result.targetY });
                }
            });

            // Kiểm tra King Towers
            const king1 = this.gameState.towers.find(t => t.id === 'p1_main');
            const king2 = this.gameState.towers.find(t => t.id === 'p2_main');
            if (king1.hp <= 0 || king2.hp <= 0) return this.endGame(king1.hp <= 0 ? 'top' : 'bottom');

            this.io.to(this.roomId).emit('gameUpdate', {
                timeLeft: Math.max(0, Math.ceil(this.gameState.timeLeft)),
                entities: this.gameState.entities.map(e => ({
                    id: e.id, x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, name: e.name, side: e.side
                })),
                towers: this.gameState.towers.map(t => ({
                    id: t.id, x: t.x, y: t.y, hp: t.hp, maxHp: t.maxHp, type: t.name, side: t.side
                })),
                players: Object.keys(this.players).map(id => ({
                    id, fairyDust: this.players[id].fairyDust
                })),
                activeSpells: this.gameState.activeSpells,
                attacks: attacks
            });
        } else {
            this.endGame();
        }
    }

    endGame(winnerSide) {
        clearInterval(this.gameInterval);
        this.io.to(this.roomId).emit('gameOver', { winner: winnerSide || "Draw!" });
    }
}

module.exports = GameRoom;
