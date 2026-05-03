require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CARD_TEMPLATE_PATH = path.resolve(__dirname, '../frontend/card-template.html');
const IMAGE_DIR = path.resolve(__dirname, '../images');

/* ── AI Summarizer (Gemini) ──────────────────────────────────────────────── */
async function summarizeDescription(text) {
    if (!text) return '';

    // Fallback: extract first 2 sentences if no Gemini key
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const short = sentences.slice(0, 2).join(' ').trim();
        return short.length > 20 ? short : text.substring(0, 180);
    }

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Summarize this news into exactly TWO short, punchy, and grammatically complete sentences for a social media poster.
Maximum 160 characters total. Do NOT use emojis or labels.
Content: ${text}`;
        const result = await model.generateContent(prompt);
        const summary = result.response.text().trim();
        console.log('🤖 AI summarized description');
        return summary;
    } catch (err) {
        console.warn('⚠️  AI summarize failed, using fallback:', err.message);
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const short = sentences.slice(0, 2).join(' ').trim();
        return short.length > 20 ? short : text.substring(0, 180);
    }
}

/* ── Step 1: Fetch News ──────────────────────────────────────────────────── */
async function fetchNews(options = {}) {
    const { topic, category, count = 1 } = options;
    console.log('📡 Fetching news...', topic ? `topic="${topic}"` : '', category ? `category="${category}"` : '', `count=${count}`);

    try {
        let url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&language=en&size=${count}`;
        if (topic) url += `&q=${encodeURIComponent(topic)}`;
        if (category && category !== 'random') url += `&category=${category}`;

        const response = await axios.get(url);
        if (response.data.results && response.data.results.length > 0) {
            const results = await Promise.all(response.data.results.map(async (article) => {
                const rawDescription = article.description || article.content || '';
                const description = await summarizeDescription(rawDescription);
                return {
                    title: article.title,
                    description,
                    image: article.image_url || null
                };
            }));
            return count === 1 ? results[0] : results;
        }
    } catch (error) {
        console.error('⚠️  News fetch failed:', error.message);
    }

    const fallback = {
        title: 'Daily News Update',
        description: 'Stay informed with the latest headlines from around the world.',
        image: null
    };
    return count === 1 ? fallback : Array(count).fill(fallback);
}


/* ── Step 2: Puppeteer Screenshot ───────────────────────────────────────── */
async function generateNewsImage(newsData) {
    console.log('🖼️  Generating news card image...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    try {
        const page = await browser.newPage();

        await page.goto(`file://${CARD_TEMPLATE_PATH}`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Inject live news data
        await page.evaluate((data) => {
            const titleEl = document.getElementById('card-headline');
            const descEl = document.getElementById('news-description');
            const imgEl = document.getElementById('news-image');
            if (titleEl) titleEl.innerText = data.title;
            if (descEl) descEl.innerText = data.description;
            if (imgEl && data.image) imgEl.src = data.image;
        }, newsData);

        // Wait for images to load
        await new Promise(r => setTimeout(r, 4000));

        // Ultra Quality — 3× deviceScaleFactor
        await page.setViewport({ width: 820, height: 1040, deviceScaleFactor: 3 });

        if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

        const timestamp = Date.now() + Math.floor(Math.random() * 1000);
        const filePath = path.join(IMAGE_DIR, `news-image-${timestamp}.png`);
        await page.screenshot({ 
            path: filePath, 
            clip: { x: 0, y: 0, width: 820, height: 1040 },
            type: 'png'
        });
        console.log(`✅ Image saved: ${filePath}`);
        return filePath;
    } finally {
        await browser.close();
    }
}


/* ── Standalone Drive Uploader ───────────────────────────────────────────── */
async function runAutomation() {
    const { google } = require('googleapis');

    function getOAuthClient() {
        const OAUTH_CREDS_PATH = path.resolve(__dirname, 'oauth-credentials.json');
        const TOKEN_PATH = path.resolve(__dirname, 'token.json');
        if (!fs.existsSync(OAUTH_CREDS_PATH)) throw new Error('oauth-credentials.json not found. Run oauth-setup.js first.');
        if (!fs.existsSync(TOKEN_PATH)) throw new Error('token.json not found. Run "node oauth-setup.js" first.');
        const { client_secret, client_id } = JSON.parse(fs.readFileSync(OAUTH_CREDS_PATH)).installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        return oAuth2Client;
    }

    async function uploadToDrive(localFilePath) {
        const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1V5UL7OwtYzn8nx-b79Y_4EJYGa8o0kAx';
        const auth = getOAuthClient();
        const drive = google.drive({ version: 'v3', auth });
        const fileName = `News_${new Date().toISOString().split('T')[0]}.png`;
        try {
            const response = await drive.files.create({
                resource: { name: fileName, parents: [DRIVE_FOLDER_ID] },
                media: { mimeType: 'image/png', body: fs.createReadStream(localFilePath) },
                fields: 'id, name, webViewLink'
            });
            console.log(`✅ Uploaded: "${response.data.name}"`);
            console.log(`🔗 View: ${response.data.webViewLink}`);
        } catch (error) {
            console.error('❌ Upload Failed:', error.message);
        }
    }

    try {
        const newsData = await fetchNews();
        const imagePath = await generateNewsImage(newsData);
        await uploadToDrive(imagePath);
        console.log('--- Automation Complete! ---');
    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
    }
}

module.exports = { fetchNews, generateNewsImage };

if (require.main === module) {
    runAutomation();
}
