/* ── State ─────────────────────────────────────────────────────── */
let selectedCategory = 'random';
let customTopic = '';
let currentImageUrl = null;
let currentDownloadName = 'news-poster.png';

/* ── DOM Refs ──────────────────────────────────────────────────── */
const generateBtn   = document.getElementById('generate-btn');
const genLabel      = document.getElementById('gen-label');
const statusBar     = document.getElementById('status-bar');
const statusText    = document.getElementById('status-text');
const errorBox      = document.getElementById('error-box');
const errorMsg      = document.getElementById('error-msg');
const resultSection = document.getElementById('result-section');
const headlineText  = document.getElementById('headline-text');
const previewImg    = document.getElementById('preview-img');
const downloadBtn   = document.getElementById('download-btn');
const topicInput    = document.getElementById('topic-input');
const clearBtn      = document.getElementById('clear-btn');

/* ── API base URL ──────────────────────────────────────────────── */
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : window.location.origin;

/* ── Category Pills ─────────────────────────────────────────────── */
document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedCategory = pill.dataset.cat;

        // Clear topic input when selecting a category
        if (customTopic) {
            topicInput.value = '';
            customTopic = '';
            clearBtn.classList.add('hidden');
        }
    });
});

/* ── Topic Input ───────────────────────────────────────────────── */
topicInput.addEventListener('input', () => {
    customTopic = topicInput.value.trim();
    clearBtn.classList.toggle('hidden', !customTopic);

    // Deselect all pills when typing a custom topic
    if (customTopic) {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        selectedCategory = '';
    } else {
        // Restore 'random' pill if input cleared
        document.querySelector('.pill[data-cat="random"]').classList.add('active');
        selectedCategory = 'random';
    }
});

topicInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') generateCard();
});

function clearTopic() {
    topicInput.value = '';
    customTopic = '';
    clearBtn.classList.add('hidden');
    document.querySelector('.pill[data-cat="random"]').classList.add('active');
    selectedCategory = 'random';
    topicInput.focus();
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function setStatus(msg) { statusText.textContent = msg; show(statusBar); }

/* ── Generate Card ───────────────────────────────────────────────── */
async function generateCard() {
    // Reset UI
    hide(statusBar);
    hide(errorBox);
    hide(resultSection);
    generateBtn.disabled = true;
    genLabel.textContent = 'Generating…';

    // Build API URL
    const params = new URLSearchParams();
    if (customTopic) {
        params.set('topic', customTopic);
        setStatus(`Searching for "${customTopic}"…`);
    } else if (selectedCategory && selectedCategory !== 'random') {
        params.set('category', selectedCategory);
        setStatus(`Fetching ${selectedCategory} news…`);
    } else {
        setStatus('Fetching top headline…');
    }

    try {
        setTimeout(() => setStatus('AI is summarizing the description…'), 3500);
        setTimeout(() => setStatus('Rendering poster with Puppeteer…'), 7000);

        const res = await fetch(`${API_BASE}/api/generate?${params.toString()}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || 'Server error');

        headlineText.textContent = data.headline;
        previewImg.src = `${API_BASE}${data.imageUrl}`;
        currentImageUrl = `${API_BASE}${data.imageUrl}`;
        currentDownloadName = data.downloadName || 'news-poster.png';

        hide(statusBar);
        show(resultSection);

        // Scroll to result on mobile
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        hide(statusBar);
        errorMsg.textContent = `${err.message}. Make sure the backend is running on port 3001.`;
        show(errorBox);
    } finally {
        generateBtn.disabled = false;
        genLabel.textContent = 'Generate Poster';
    }
}

/* ── Download Card ───────────────────────────────────────────────── */
async function downloadCard() {
    if (!currentImageUrl) return;

    const dlLabel = document.getElementById('dl-label');
    downloadBtn.disabled = true;
    dlLabel.textContent = 'Downloading…';

    try {
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = currentDownloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        dlLabel.textContent = '✅ Saved!';
        setTimeout(() => { dlLabel.textContent = 'Download PNG'; }, 2500);
    } catch (err) {
        dlLabel.textContent = 'Error!';
        console.error('Download failed:', err);
    } finally {
        downloadBtn.disabled = false;
    }
}
