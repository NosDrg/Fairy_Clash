const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fairyDust: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
    currentDeck: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }], // Max 10 cards
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
