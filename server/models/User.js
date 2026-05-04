const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username:    { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    password:    { type: String, required: true },

    // Profile & Progression
    cups:  { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    exp:   { type: Number, default: 0 },

    // Card collection & decks (stored as card names for simplicity)
    cardCollection: { type: [String], default: [] },
    decks: {
        type: [[String]],
        default: [[], [], []]
    },

    // Win/loss record
    stats: {
        wins:   { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    }
}, { timestamps: true });

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
