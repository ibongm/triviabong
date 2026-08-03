// Admin-only endpoint: merges an uploaded question batch into the matching
// src/data/categories/*.json file by committing the change to GitHub, which
// triggers Vercel's normal auto-deploy on push to main. This exists because
// TriviaBong is a static client-only SPA - the browser has no way to write
// back to the repo directly, so this function is the write path.
//
// Env vars required (Vercel project settings, Production + Preview):
//   GITHUB_TOKEN  - fine-grained PAT scoped to this repo, Contents: read/write
//   GITHUB_REPO   - "owner/repo", e.g. "ibongm/triviabong"
//   GITHUB_BRANCH - defaults to "main"
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { validateQuestions, mergeQuestions, CATEGORY_FILES } from '../src/utils/questionMerge.js';

const ADMIN_EMAIL = 'ivanm.ploce@gmail.com';
const FIREBASE_PROJECT_ID = 'triviabong-web';
const GITHUB_API = 'https://api.github.com';

// Google's public JWKS for verifying Firebase Auth ID tokens - no service
// account key needed. Fetched once per cold start and cached by jose.
const JWKS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const verifyAdmin = async (req) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return { ok: false, status: 401, message: 'Nedostaje Authorization: Bearer token.' };
    }
    const token = authHeader.slice('Bearer '.length);

    let payload;
    try {
        ({ payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        }));
    } catch {
        return { ok: false, status: 401, message: 'Token nije valjan ili je istekao.' };
    }

    if (payload.email !== ADMIN_EMAIL) {
        return { ok: false, status: 403, message: 'Nemate administratorska prava.' };
    }
    return { ok: true };
};

const githubRequest = (path, options = {}) => fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
    },
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    const auth = await verifyAdmin(req);
    if (!auth.ok) {
        res.status(auth.status).json({ error: auth.message });
        return;
    }

    const { category, questions } = req.body || {};
    const filename = CATEGORY_FILES[category];
    if (!filename) {
        res.status(400).json({ error: `Nepoznata kategorija: ${category}` });
        return;
    }

    const { valid, errors } = validateQuestions(questions);
    if (valid.length === 0) {
        res.status(400).json({ error: 'Nema ispravnih pitanja u datoteci.', invalid: errors });
        return;
    }

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
        res.status(500).json({ error: 'Server nije ispravno konfiguriran (nedostaje GITHUB_TOKEN/GITHUB_REPO).' });
        return;
    }
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = `src/data/categories/${filename}`;

    const getRes = await githubRequest(`/repos/${repo}/contents/${filePath}?ref=${branch}`);
    if (!getRes.ok) {
        res.status(502).json({ error: 'Neuspješno čitanje trenutne datoteke kategorije s GitHuba.' });
        return;
    }
    const getJson = await getRes.json();

    let existing;
    try {
        existing = JSON.parse(Buffer.from(getJson.content, 'base64').toString('utf8'));
    } catch {
        res.status(500).json({ error: 'Postojeća datoteka kategorije nije valjan JSON.' });
        return;
    }

    const { merged, added, skipped } = mergeQuestions(existing, valid, category);

    if (added === 0) {
        res.status(200).json({
            added: 0,
            skipped,
            invalid: errors,
            total: existing.length,
            message: 'Nema novih pitanja za dodati (sve su duplikati).',
        });
        return;
    }

    const putRes = await githubRequest(`/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: `Add ${added} question(s) to ${category} via admin upload`,
            content: Buffer.from(JSON.stringify(merged, null, 4) + '\n', 'utf8').toString('base64'),
            sha: getJson.sha,
            branch,
        }),
    });

    if (putRes.status === 409) {
        res.status(409).json({ error: 'Datoteka je promijenjena u međuvremenu, pokušajte ponovno.' });
        return;
    }
    if (!putRes.ok) {
        const details = await putRes.text();
        res.status(502).json({ error: 'Neuspješno spremanje promjena na GitHub.', details });
        return;
    }

    const putJson = await putRes.json();
    res.status(200).json({
        added,
        skipped,
        invalid: errors,
        total: merged.length,
        commitUrl: putJson.commit?.html_url || null,
    });
}
