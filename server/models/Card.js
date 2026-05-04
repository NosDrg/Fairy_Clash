const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Tanker', 'Melee', 'Support', 'Defense', 'Range', 'Spell', 'Charger', 'Flying', 'Building'], required: true },
    cost: { type: Number, required: true },
    hp: { type: Number, default: 0 },
    damage: { type: Number, default: 0 },
    attackSpeed: { type: Number, default: 1 }, // seconds per attack
    moveSpeed: { type: Number, default: 1 },
    range: { type: Number, default: 1 }, // 1 for melee
    faction: { type: String, required: true },
    description: String,
    image: String
});

module.exports = mongoose.model('Card', cardSchema);
