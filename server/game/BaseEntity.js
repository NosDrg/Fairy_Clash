class BaseEntity {
    constructor(id, ownerId, stats, x, y, side) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = stats.name;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.damage = stats.damage;
        this.attackSpeed = stats.attackSpeed;
        this.range = stats.range;
        this.x = x;
        this.y = y;
        this.side = side;
        this.isAoE = stats.isAoE || false;
        this.aoeRadius = stats.aoeRadius || 0;
        this.targetPreference = stats.targetPreference || 'all';
        this.lastAttackTime = 0;
        this.target = null;
        this.stunnedUntil = 0;
        this.slowedUntil = 0;
    }

    applyStun(durationMs) {
        this.stunnedUntil = Math.max(this.stunnedUntil, Date.now() + durationMs);
    }

    applySlow(durationMs) {
        this.slowedUntil = Math.max(this.slowedUntil, Date.now() + durationMs);
    }

    isStunned() {
        return Date.now() < this.stunnedUntil;
    }

    isSlowed() {
        return Date.now() < this.slowedUntil;
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    isEnemy(other) {
        return other && other.side !== this.side;
    }

    getDistance(other) {
        return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2));
    }

    findNearestTarget(gameState) {
        let nearest = null;
        let minDist = Infinity;

        // Ưu tiên tấn công lính trước, tháp sau
        let potentialTargets = [...gameState.entities, ...gameState.towers];
        
        if (this.targetPreference === 'building') {
            potentialTargets = [...gameState.towers];
        }

        for (const target of potentialTargets) {
            if (this.isEnemy(target) && target.hp > 0) {
                const dist = this.getDistance(target);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = target;
                }
            }
        }
        return nearest;
    }

    attack(gameState) {
        if (this.isStunned()) return false;
        const now = Date.now();
        let currentAttackSpeed = this.attackSpeed;
        if (this.isSlowed()) currentAttackSpeed *= 1.5;
        
        if (now - this.lastAttackTime >= currentAttackSpeed * 1000) {
            if (this.target && this.getDistance(this.target) <= this.range) {
                if (this.isAoE && gameState) {
                    const potentialTargets = [...gameState.entities, ...gameState.towers];
                    potentialTargets.forEach(t => {
                        if (this.isEnemy(t) && t.hp > 0 && this.target.getDistance(t) <= this.aoeRadius) {
                            t.takeDamage(this.damage);
                        }
                    });
                } else {
                    this.target.takeDamage(this.damage);
                }
                this.lastAttackTime = now;
                return true;
            }
        }
        return false;
    }
}

module.exports = BaseEntity;
