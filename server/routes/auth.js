const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// ─── Helper ───────────────────────────────────────────────────────────────────
const ALL_CARD_NAMES = [
    'Snow White', 'Deep Woods Witch', 'Royal Knight', 'Dwarf Swarm',
    'Miner Dwarf', 'Huntsman', 'Fairy Bluebird', 'Dwarf Hut',
    'Poison Apple', 'Miner Bomb', 'The King', 'Tin Woodman',
    'Scarecrow', 'Oz Tornado', 'Cowardly Lion', 'Wicked Witch', "Glinda's Light"
];

const DEFAULT_DECKS = [
    ALL_CARD_NAMES.slice(0, 10),
    ALL_CARD_NAMES.slice(1, 11),
    [...ALL_CARD_NAMES.slice(0, 5), ...ALL_CARD_NAMES.slice(6, 11)]
];

function publicProfile(user) {
    return {
        username:    user.username,
        displayName: user.displayName,
        cups:        user.cups,
        level:       user.level,
        exp:         user.exp,
        stats:       user.stats,
        cardCollection: user.cardCollection,
        decks:       user.decks
    };
}

function verifyToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { username, displayName, password } = req.body;

        if (!username || !displayName || !password)
            return res.status(400).json({ error: 'Username, display name and password are required' });

        if (username.length < 3 || username.length > 20)
            return res.status(400).json({ error: 'Username must be 3–20 characters' });

        if (displayName.length < 2 || displayName.length > 30)
            return res.status(400).json({ error: 'Display name must be 2–30 characters' });

        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' });

        if (await User.findOne({ username }))
            return res.status(400).json({ error: 'Username already taken' });

        const user = new User({
            username,
            displayName,
            password,
            cardCollection: ALL_CARD_NAMES,
            decks:          DEFAULT_DECKS
        });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, profile: publicProfile(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ error: 'Username and password are required' });

        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ error: 'Invalid username or password' });

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, profile: publicProfile(user) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ profile: publicProfile(user) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── PUT /api/auth/decks ──────────────────────────────────────────────────────
// Body: { decks: string[][] }  – lưu 3 bộ bài của người dùng
router.put('/decks', verifyToken, async (req, res) => {
    try {
        const { decks } = req.body;
        if (!Array.isArray(decks) || decks.length !== 3)
            return res.status(400).json({ error: 'decks must be an array of 3 decks' });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { decks },
            { new: true }
        );
        res.json({ profile: publicProfile(user) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/auth/game-result ──────────────────────────────────────────────
// Body: { result: 'win' | 'loss' | 'draw' }
router.post('/game-result', verifyToken, async (req, res) => {
    try {
        const { result } = req.body;
        const cupsChange = result === 'win' ? 30 : result === 'loss' ? -20 : 0;

        const update = { $inc: { cups: cupsChange } };
        if (result === 'win')  update.$inc['stats.wins']   = 1;
        if (result === 'loss') update.$inc['stats.losses'] = 1;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            update,
            { new: true }
        );
        if (user.cups < 0) {
            user.cups = 0;
            await user.save();
        }
        res.json({ profile: publicProfile(user) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
