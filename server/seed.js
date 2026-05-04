require('dotenv').config();
const mongoose = require('mongoose');
const Card = require('./models/Card');

const snowWhiteCards = [
    { name: 'Bạch Tuyết', type: 'Tanker', cost: 5, hp: 3000, damage: 150, attackSpeed: 1.5, moveSpeed: 1, range: 1, faction: 'Snow White' },
    { name: 'Chú Lùn Đào Mỏ', type: 'Melee', cost: 2, hp: 600, damage: 80, attackSpeed: 0.8, moveSpeed: 1.5, range: 1, faction: 'Snow White' },
    { name: 'Chú Lùn Thông Thái', type: 'Support', cost: 3, hp: 800, damage: 50, attackSpeed: 1.2, moveSpeed: 1, range: 3, faction: 'Snow White' },
    { name: 'Chú Lùn Cáu Kỉnh', type: 'Defense', cost: 4, hp: 1500, damage: 120, attackSpeed: 1.8, moveSpeed: 0.8, range: 1, faction: 'Snow White' },
    { name: 'Thợ Săn', type: 'Range', cost: 4, hp: 1000, damage: 200, attackSpeed: 2.0, moveSpeed: 1, range: 6, faction: 'Snow White' },
    { name: 'Gương Thần', type: 'Spell', cost: 3, hp: 0, damage: 0, attackSpeed: 0, moveSpeed: 0, range: 4, faction: 'Snow White' },
    { name: 'Táo Độc', type: 'Spell', cost: 4, hp: 0, damage: 40, attackSpeed: 0, moveSpeed: 0, range: 5, faction: 'Snow White' },
    { name: 'Xe Ngựa Pha Lê', type: 'Charger', cost: 5, hp: 2000, damage: 250, attackSpeed: 2.5, moveSpeed: 2, range: 1, faction: 'Snow White' },
    { name: 'Chim Xanh Cổ Tích', type: 'Flying', cost: 2, hp: 300, damage: 40, attackSpeed: 1.0, moveSpeed: 2, range: 3, faction: 'Snow White' },
    { name: 'Nhà Của Bảy Chú Lùn', type: 'Building', cost: 6, hp: 2000, damage: 0, attackSpeed: 0, moveSpeed: 0, range: 0, faction: 'Snow White' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');
        
        await Card.deleteMany({ faction: 'Snow White' });
        await Card.insertMany(snowWhiteCards);
        
        console.log('✅ Successfully seeded Snow White cards!');
        process.exit();
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
}

seed();
