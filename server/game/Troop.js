const BaseEntity = require('./BaseEntity');

class Troop extends BaseEntity {
    constructor(id, ownerId, stats, x, y, side) {
        super(id, ownerId, stats, x, y, side);
        this.moveSpeed = stats.moveSpeed;
    }

    update(gameState, tickRate) {
        if (this.hp <= 0 || this.isStunned()) return;

        // 1. Tìm hoặc kiểm tra mục tiêu
        if (!this.target || this.target.hp <= 0) {
            this.target = this.findNearestTarget(gameState);
        }

        if (!this.target) return;

        const dist = this.getDistance(this.target);

        // 2. Di chuyển hoặc Tấn công
        if (dist > this.range) {
            // Thay vì đi thẳng tới target, chúng ta xin tọa độ cần đi từ hệ thống dẫn đường
            const targetPoint = this.getNavigationPoint();
            this.moveTowards(targetPoint, tickRate);
        } else {
            if (this.attack(gameState)) {
                return { action: 'attack', targetId: this.target.id, startX: this.x, startY: this.y, targetX: this.target.x, targetY: this.target.y };
            }
        }
    }

   // Hệ thống dẫn đường thông minh (Đã nâng cấp để nhận diện chiều rộng cầu)
    getNavigationPoint() {
        const RIVER_TOP = 45;       // Bờ sông phía trên
        const RIVER_BOTTOM = 55;    // Bờ sông phía dưới
        
        // Điều chỉnh lại tọa độ cầu cho khớp UI
        const BRIDGE_LEFT_START = 15;
        const BRIDGE_LEFT_END = 30;
        
        // Cầu phải có class right-[20%] nên cạnh phải của nó là 80%
        // Với chiều rộng khoảng 15%, cạnh trái sẽ bắt đầu từ 65%
        const BRIDGE_RIGHT_START = 65; 
        const BRIDGE_RIGHT_END = 80;

        const isTargetAboveRiver = this.target.y < RIVER_TOP;
        const isTargetBelowRiver = this.target.y > RIVER_BOTTOM;

        // BƯỚC 1: Đã cùng bờ thì đi thẳng tới mục tiêu (Không cần quan tâm cầu)
        if ((this.y <= RIVER_TOP && isTargetAboveRiver) ||
            (this.y >= RIVER_BOTTOM && isTargetBelowRiver)) {
            return this.target;
        }

        // Kiểm tra xem lính có đang đứng đối diện với mặt cầu không (X nằm trong chiều rộng cầu)
        const isOnLeftBridgeX = this.x >= BRIDGE_LEFT_START && this.x <= BRIDGE_LEFT_END;
        const isOnRightBridgeX = this.x >= BRIDGE_RIGHT_START && this.x <= BRIDGE_RIGHT_END;
        const isAlignedWithBridge = isOnLeftBridgeX || isOnRightBridgeX;

        // BƯỚC 2: Nếu lính đang ĐỨNG TRÊN SÔNG
        if (this.y > RIVER_TOP && this.y < RIVER_BOTTOM) {
            // Chỉ cần đi thẳng tắp sang bờ bên kia (Giữ nguyên X)
            return { 
                x: this.x, 
                y: this.y > this.target.y ? RIVER_TOP : RIVER_BOTTOM 
            };
        }

        // BƯỚC 3: Nếu chưa lên sông, xác định điểm đến trên bờ sông
        let targetBridgeX = this.x; // Mặc định giữ nguyên X nếu đã nằm trên cầu

        // Nếu chưa thẳng hàng với cầu, tìm cây cầu tối ưu nhất để đi
        if (!isAlignedWithBridge) {
            const leftBridgeCenter = (BRIDGE_LEFT_START + BRIDGE_LEFT_END) / 2;
            const rightBridgeCenter = (BRIDGE_RIGHT_START + BRIDGE_RIGHT_END) / 2;
            
            // Tính tổng khoảng cách trục X: (Từ Lính đến Cầu) + (Từ Cầu đến Mục tiêu)
            const totalDistLeft = Math.abs(this.x - leftBridgeCenter) + Math.abs(this.target.x - leftBridgeCenter);
            const totalDistRight = Math.abs(this.x - rightBridgeCenter) + Math.abs(this.target.x - rightBridgeCenter);
            
            // So sánh và chọn cây cầu mang lại tổng quãng đường ngắn nhất
            targetBridgeX = totalDistLeft < totalDistRight ? leftBridgeCenter : rightBridgeCenter;
        }

        // Trả về tọa độ điểm đến: X là targetBridgeX, Y là bờ sông tương ứng
        if (this.y >= RIVER_BOTTOM) {
            return { x: targetBridgeX, y: RIVER_BOTTOM }; // Lính từ dưới đi lên
        } else {
            return { x: targetBridgeX, y: RIVER_TOP };    // Lính từ trên đi xuống
        }
    }

    moveTowards(target, tickRate) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            let speed = this.moveSpeed;
            if (this.isSlowed()) speed *= 0.5;
            const vx = (dx / dist) * speed * (tickRate / 1000);
            const vy = (dy / dist) * speed * (tickRate / 1000);
            this.x += vx;
            this.y += vy;
        }
    }
}

module.exports = Troop;