class Entity {
    constructor(id, ownerId, cardStats, x, y, side) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = cardStats.name;
        this.type = cardStats.type;
        this.hp = cardStats.hp;
        this.maxHp = cardStats.hp;
        this.damage = cardStats.damage;
        this.attackSpeed = cardStats.attackSpeed;
        this.moveSpeed = cardStats.moveSpeed;
        this.range = cardStats.range;
        this.x = x;
        this.y = y;
        this.side = side; // 'top' or 'bottom'
        this.target = null;
        this.lastAttackTime = 0;
    }

    update(gameState, tickRate) {
        // 1. Tìm mục tiêu nếu chưa có hoặc mục tiêu đã chết
        if (!this.target || this.target.hp <= 0) {
            this.target = this.findNearestTarget(gameState);
        }

        if (!this.target) return;

        // 2. Tính khoảng cách tới mục tiêu
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 3. Di chuyển hoặc tấn công
        if (distance > this.range) {
            // Di chuyển tới mục tiêu
            const vx = (dx / distance) * this.moveSpeed * (tickRate / 100);
            const vy = (dy / distance) * this.moveSpeed * (tickRate / 100);
            this.x += vx;
            this.y += vy;
        } else {
            // Tấn công
            const now = Date.now();
            if (now - this.lastAttackTime >= this.attackSpeed * 1000) {
                this.target.hp -= this.damage;
                this.lastAttackTime = now;
                console.log(`${this.name} attacked ${this.target.id || this.target.type}! Remaining HP: ${this.target.hp}`);
            }
        }
    }

    findNearestTarget(gameState) {
        let nearest = null;
        let minDist = Infinity;

        // Tìm trong tháp đối phương
        gameState.towers.forEach(tower => {
            if (tower.side !== this.side && tower.hp > 0) {
                const dist = Math.sqrt(Math.pow(tower.x - this.x, 2) + Math.pow(tower.y - this.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    nearest = tower;
                }
            }
        });

        // Tìm trong lính đối phương
        gameState.entities.forEach(entity => {
            if (entity.side !== this.side && entity.hp > 0) {
                const dist = Math.sqrt(Math.pow(entity.x - this.x, 2) + Math.pow(entity.y - this.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    nearest = entity;
                }
            }
        });

        return nearest;
    }
}

module.exports = Entity;
