const BaseEntity = require('./BaseEntity');

class Building extends BaseEntity {
    constructor(id, ownerId, stats, x, y, side) {
        super(id, ownerId, stats, x, y, side);
        this.spawnRate = stats.spawnRate || 0; // Thời gian sinh quân (giây)
        this.lastSpawnTime = Date.now();
    }

    update(gameState, tickRate) {
        if (this.hp <= 0) return;
        if (this.isStunned()) return;

        // Tự động mất máu (decay) cho các nhà sinh quân: Sống tối đa 20 giây thay vì 40 giây để cân bằng
        if (this.spawnRate > 0) {
            const decayAmount = (this.maxHp / 20) * (tickRate / 1000);
            this.hp -= decayAmount;
            if (this.hp <= 0) return;
        }

        // Nếu là công trình phòng thủ (có tầm đánh)
        if (this.range > 0) {
            if (!this.target || this.target.hp <= 0 || this.getDistance(this.target) > this.range) {
                this.target = this.findNearestTarget(gameState);
            }
            if (this.target && this.attack(gameState)) {
                return { action: 'attack', targetId: this.target.id, startX: this.x, startY: this.y, targetX: this.target.x, targetY: this.target.y };
            }
        }

        // Nếu là công trình sinh quân (như Nhà Chú Lùn)
        if (this.spawnRate > 0) {
            if (this.handleSpawning(gameState)) {
                return { action: 'spawn', ownerId: this.ownerId, x: this.x, y: this.y, side: this.side };
            }
        }
    }

    handleSpawning(gameState) {
        const now = Date.now();
        if (now - this.lastSpawnTime >= this.spawnRate * 1000) {
            // Logic sinh quân con sẽ được gọi từ GameRoom thông qua một callback hoặc sự kiện
            this.lastSpawnTime = now;
            return true; 
        }
        return false;
    }
}

module.exports = Building;
