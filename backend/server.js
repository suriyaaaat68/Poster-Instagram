require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { fetchNews, generateNewsImage } = require('./upload');

const ACCESS_PIN = process.env.ACCESS_PIN || '638034';
const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback';

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development to allow external fonts/images easily
}));
app.use(cors());
app.use(express.json());

// Rate Limiting: Prevent brute force on login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    message: { success: false, error: 'Too many login attempts, please try again after 15 minutes.' }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

app.use(express.static(path.resolve(__dirname, '../frontend')));

const IMAGE_DIR = path.resolve(__dirname, '../images');
app.use('/images', express.static(IMAGE_DIR));

/* ── API: Auth ───────────────────────────────────────────────────────────── */
app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { pin } = req.body;
    if (pin === ACCESS_PIN) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, error: 'Incorrect PIN' });
});

/* ── API: Generate News Card ─────────────────────────────────────────────── */
app.get('/api/generate', authenticateToken, async (req, res) => {
    const { topic, category } = req.query;
    console.log(`[API] /api/generate  topic="${topic || ''}"  category="${category || ''}"`);

    try {
        const newsData = await fetchNews({ topic, category });
        const imagePath = await generateNewsImage(newsData);

        const fileName = path.basename(imagePath);
        res.json({
            success: true,
            headline: newsData.title,
            description: newsData.description,
            imageUrl: `/images/${fileName}`,
            downloadName: fileName
        });
    } catch (err) {
        console.error('[API] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ── API: Fetch news list for custom topic (preview only, no image) ──────── */
app.get('/api/news', authenticateToken, async (req, res) => {
    const { topic, category } = req.query;
    try {
        const newsData = await fetchNews({ topic, category });
        res.json({ success: true, headline: newsData.title, description: newsData.description });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/* ── API: Generate Multiple News Cards ──────────────────────────────────── */
app.get('/api/generate-multiple', authenticateToken, async (req, res) => {
    let { topic, category, count } = req.query;
    count = parseInt(count) || 2;
    if (count > 5) count = 5;

    console.log(`[API] /api/generate-multiple topic="${topic || ''}" category="${category || ''}" count=${count}`);

    try {
        const newsItems = await fetchNews({ topic, category, count });
        const items = Array.isArray(newsItems) ? newsItems : [newsItems];
        
        const results = [];
        for (const item of items) {
            const imagePath = await generateNewsImage(item);
            const fileName = path.basename(imagePath);
            results.push({
                headline: item.title,
                description: item.description,
                imageUrl: `/images/${fileName}`,
                downloadName: fileName
            });
        }

        res.json({ success: true, results });
    } catch (err) {
        console.error('[API] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📰 Open that URL in your browser to use the app.\n`);
});
