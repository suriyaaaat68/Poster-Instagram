import { useState, useRef } from 'react';

const CATEGORIES = [
  { id: 'random',        label: '🔀 Random' },
  { id: 'technology',    label: '💻 Technology' },
  { id: 'business',      label: '💼 Business' },
  { id: 'sports',        label: '⚽ Sports' },
  { id: 'politics',      label: '🏛️ Politics' },
  { id: 'entertainment', label: '🎭 Entertainment' },
  { id: 'science',       label: '🔬 Science' },
  { id: 'health',        label: '❤️ Health' },
  { id: 'world',         label: '🌍 World' },
];

const STATUS_MSGS = [
  'Fetching latest news…',
  'AI is summarizing content…',
  'Rendering ultra-quality posters…',
  'Applying final polish…',
];

export default function App() {
  const [category, setCategory] = useState('random');
  const [topic, setTopic]       = useState('');
  const [count, setCount]       = useState(2);
  const [phase, setPhase]       = useState('idle'); // idle | loading | done | error
  const [msgIdx, setMsgIdx]     = useState(0);
  const [results, setResults]   = useState([]);
  const [error, setError]       = useState('');
  const [dlStates, setDlStates] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [pin, setPin]               = useState('');
  const [pinError, setPinError]     = useState(false);
  const [loginMsg, setLoginMsg]     = useState('');
  const resultRef  = useRef(null);
  const intervalRef = useRef(null);

  /* ── Helpers ───────────────────────────────────────────── */
  async function handleLogin() {
    setLoginMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        localStorage.setItem('token', data.token);
        setPinError(false);
      } else {
        setPinError(true);
        setLoginMsg(data.error || 'Incorrect PIN');
        setPin('');
        setTimeout(() => {
          setPinError(false);
          setLoginMsg('');
        }, 3000);
      }
    } catch (err) {
      setPinError(true);
      setLoginMsg('Server error. Try again.');
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    setPin('');
  }

  function selectCategory(cat) {
    setCategory(cat);
    setTopic('');
  }

  function handleTopic(val) {
    setTopic(val);
    setCategory(val.trim() ? '' : 'random');
  }

  /* ── Generate ───────────────────────────────────────────── */
  async function generate() {
    setPhase('loading');
    setResults([]);
    setError('');
    setMsgIdx(0);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % STATUS_MSGS.length;
      setMsgIdx(idx);
    }, 5500);

    try {
      const params = new URLSearchParams({ count });
      if (topic.trim())                      params.set('topic', topic.trim());
      else if (category && category !== 'random') params.set('category', category);

      const res  = await fetch(`/api/generate-multiple?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        throw new Error('Session expired. Please login again.');
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Server error');

      setResults(data.results);
      setPhase('done');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    } finally {
      clearInterval(intervalRef.current);
    }
  }

  /* ── Sample Test (No API) ───────────────────────────────── */
  function sampleTest() {
    setPhase('loading');
    setResults([]);
    setError('');
    setMsgIdx(0);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % STATUS_MSGS.length;
      setMsgIdx(idx);
    }, 1500); // Faster for testing

    setTimeout(() => {
      const mockResults = [
        {
          headline: "this is sample heading",
          imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
          description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
          downloadName: "sample_poster_1.png"
        },
        {
          headline: "Rashid Khan Urges Gujarat Titans to Focus on Strengths, Not Middle-Order Concerns",
          imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80",
          description: "Rashid Khan admits GT middle-order concerns in IPL but urges team to focus on strengths to keep momentum going.",
          downloadName: "sample_poster_2.png"
        }
      ];

      if (count === 3) {
        mockResults.push({
          headline: "SpaceX Successfully Launches Next Generation Starlink Satellites",
          imageUrl: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&q=80",
          downloadName: "sample_poster_3.png"
        });
      }


      setResults(mockResults);
      setPhase('done');
      clearInterval(intervalRef.current);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }, 4500);
  }


  /* ── Download ───────────────────────────────────────────── */
  async function download(imageUrl, headline, idx) {
    setDlStates(s => ({ ...s, [idx]: 'loading' }));
    try {
      // Sanitize headline to be a safe filename
      const safeName = headline
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 50);
      const fileName = `${safeName || 'news_poster'}.png`;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDlStates(s => ({ ...s, [idx]: 'done' }));
      setTimeout(() => setDlStates(s => ({ ...s, [idx]: '' })), 2500);
    } catch (err) {
      console.error('Download error:', err);
      setDlStates(s => ({ ...s, [idx]: 'error' }));
    }
  }


  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="app">
      <div className="orb orb1" />
      <div className="orb orb2" />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="header">
        <div className="logo">
          <span className="logo-dot" />
          report.live
        </div>
        <div className="header-right">
          {isLoggedIn && (
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          )}
          <span className="header-tag">AI Poster Generator</span>
        </div>
      </header>

      {!isLoggedIn ? (
        <main className="main login-container">
          <div className="login-card">
            <div className="login-icon">🔐</div>
            <h2 className="login-title">Access Restricted</h2>
            <p className="login-sub">Please enter your 6-digit PIN to continue.</p>
            
            <div className={`pin-input-wrap${pinError ? ' shake' : ''}`}>
              <input
                type="password"
                className="pin-input-field"
                placeholder="······"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
              <button className="btn-login" onClick={handleLogin}>
                Verify Access
              </button>
            </div>
            
            {loginMsg && <p className="login-error">{loginMsg}</p>}
          </div>
        </main>
      ) : (
        <main className="main">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="hero">
          <h1 className="hero-title">
            Create Your<br />
            <span className="pink">News Posters</span>
          </h1>
          <p className="hero-sub">
            Pick a category, enter a topic, choose count — AI generates
            ultra-quality posters from live headlines.
          </p>
        </section>

        {/* ── Category Pills ─────────────────────────────────── */}
        <div className="section">
          <p className="label">Choose Category</p>
          <div className="pills" role="group" aria-label="News categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`pill${category === cat.id && !topic ? ' active' : ''}`}
                onClick={() => selectCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Topic Input ─────────────────────────────────────── */}
        <div className="section">
          <p className="label">Or Search a Custom Topic</p>
          <div className={`topic-wrap${topic ? ' has-value' : ''}`}>
            <span className="topic-icon">🔍</span>
            <input
              id="topic-input"
              className="topic-input"
              placeholder="e.g. Bitcoin, IPL 2026, Budget, AI…"
              value={topic}
              maxLength={80}
              onChange={e => handleTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
            />
            {topic && (
              <button className="clear-btn" aria-label="Clear" onClick={() => handleTopic('')}>✕</button>
            )}
          </div>
        </div>

        {/* ── Count Selector ──────────────────────────────────── */}
        <div className="section">
          <p className="label">How Many Posters? (Max 5)</p>
          <div className="count-input-wrap">
            <input
              type="number"
              className="count-input"
              value={count}
              min="1"
              max="5"
              onChange={e => setCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
            />
            <span className="count-label">Posters</span>
          </div>
        </div>


        {/* ── Generate Button ─────────────────────────────────── */}
        <div className="gen-wrap">
          <button
            id="generate-btn"
            className="btn-generate"
            onClick={generate}
            disabled={phase === 'loading'}
          >
            {phase === 'loading'
              ? <><span className="btn-spinner" /> Generating…</>
              : <>✨ Generate {count} Poster{count > 1 ? 's' : ''}</>
            }
          </button>
          
          <button 
            className="btn-sample"
            onClick={sampleTest}
            disabled={phase === 'loading'}
          >
            🧪 Sample Test (No API)
          </button>
        </div>


        {/* ── Status Bar ──────────────────────────────────────── */}
        {phase === 'loading' && (
          <div className="status-bar" role="status">
            <div className="spinner" />
            <span>{STATUS_MSGS[msgIdx]}</span>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="error-box" role="alert">
            ⚠️ {error}
            <br /><small>Make sure the backend server is running on port 3001.</small>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {phase === 'done' && results.length > 0 && (
          <section className="results" ref={resultRef}>
            <div className="results-header">
              <p className="label">✅ {results.length} Poster{results.length > 1 ? 's' : ''} Generated</p>
              <button className="btn-regen" onClick={generate}>🔄 New Batch</button>
            </div>

            <div className={`result-grid grid-${results.length}`}>
              {results.map((r, i) => (
                <article className="poster-card" key={i}>
                  {/* Headline chip */}
                  <div className="poster-chip">
                    <span className="chip-dot" />
                    <p className="chip-text">{r.headline}</p>
                  </div>

                  {/* Poster image */}
                  <div className="poster-frame">
                    <img
                      src={r.imageUrl}
                      alt={r.headline}
                      className="poster-img"
                      loading="lazy"
                    />
                    <div className="poster-shine" />
                  </div>

                  {/* Simulated description */}
                  <div className="poster-desc-sim">
                    {r.description || 'AI is generating a summary for this article...'}
                  </div>

                  {/* Download */}

                  <button
                    className={`btn-download${dlStates[i] === 'done' ? ' done' : ''}`}
                    onClick={() => download(r.imageUrl, r.headline, i)}
                    disabled={dlStates[i] === 'loading'}
                    id={`download-btn-${i}`}
                  >

                    {dlStates[i] === 'loading' ? '⏳ Saving…'
                      : dlStates[i] === 'done'    ? '✅ Saved!'
                      : '⬇️ Download PNG'}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

      </main>
      )}

      <footer className="footer">
        <p>Powered by <strong>report.live</strong> · NewsData.io · Gemini AI</p>
      </footer>
    </div>
  );
}
