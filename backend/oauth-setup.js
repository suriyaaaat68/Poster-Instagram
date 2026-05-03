/**
 * oauth-setup.js
 * Run this ONCE to authorize your Google account.
 * It will save a token.json file that upload.js will use from now on.
 *
 * Usage:  node oauth-setup.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');
const open = require('open');

// ─── YOUR OAUTH CREDENTIALS ────────────────────────────────────────────────
// 1. Go to https://console.cloud.google.com/
// 2. APIs & Services → Credentials → Create Credentials → OAuth client ID
// 3. Application type: "Desktop app"
// 4. Download JSON → rename to oauth-credentials.json → put in this folder
// ───────────────────────────────────────────────────────────────────────────
const OAUTH_CREDS_PATH = path.resolve(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.resolve(__dirname, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function main() {
    if (!fs.existsSync(OAUTH_CREDS_PATH)) {
        console.error(`\n❌ Missing: ${OAUTH_CREDS_PATH}`);
        console.error('   Follow the instructions in the file header to create OAuth credentials.\n');
        process.exit(1);
    }

    const { client_secret, client_id, redirect_uris } = JSON.parse(
        fs.readFileSync(OAUTH_CREDS_PATH)
    ).installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000');

    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });

    console.log('\n🔐 Opening browser for Google authorization...');
    console.log('   (If browser doesn\'t open, paste this URL manually):\n');
    console.log(authUrl + '\n');

    // Open browser automatically
    try { await open(authUrl); } catch (_) {}

    // Start a local server to catch the redirect
    await new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            const qs = new URL(req.url, 'http://localhost:3000').searchParams;
            const code = qs.get('code');
            if (!code) { res.end('No code found.'); return; }

            res.end('<h2>✅ Authorization successful! You can close this tab.</h2>');
            server.close();

            const { tokens } = await oAuth2Client.getToken(code);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
            console.log('✅ token.json saved! You can now run:  node upload.js\n');
            resolve();
        });

        server.listen(3000, () => console.log('⏳ Waiting for authorization on http://localhost:3000 ...\n'));
    });
}

main().catch(console.error);
