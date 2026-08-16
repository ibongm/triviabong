// Admin-only endpoint: adds, edits, or removes questions in the matching
// src/data/categories/*.json file by committing the change to GitHub, which
// triggers Vercel's normal auto-deploy on push to main. This exists because
// KvizArena is a static client-only SPA - the browser has no way to write
// back to the repo directly, so this function is the write path.
//
// Body shape: { action, category, ... } - action is 'add' (default, kept for
// backward compatibility with the original upload-only client), 'edit', or
// 'delete'. See src/components/AdminPanel.jsx for the three call shapes.
//
// Env vars required (Vercel project settings, Production + Preview):
//   GITHUB_TOKEN  - fine-grained PAT scoped to this repo, Contents: read/write
//   GITHUB_REPO   - "owner/repo", e.g. "ibongm/triviabong"
//   GITHUB_BRANCH - defaults to "main"
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
    validateQuestions,
    mergeQuestions,
    removeQuestionById,
    editQuestionById,
    CATEGORY_FILES,
} from '../src/utils/questionMerge.js';

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

    if (!(payload.admin === true || (payload.email === ADMIN_EMAIL && payload.email_verified === true))) {
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

// Reads a category file's current parsed content + blob sha from GitHub.
const getCategoryFile = async (repo, branch, filePath) => {
    const res = await githubRequest(`/repos/${repo}/contents/${filePath}?ref=${branch}`);
    if (!res.ok) {
        return { ok: false, status: 502, error: 'Neuspješno čitanje trenutne datoteke kategorije s GitHuba.' };
    }
    const json = await res.json();

    let content;
    try {
        content = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
    } catch {
        return { ok: false, status: 500, error: 'Postojeća datoteka kategorije nije valjan JSON.' };
    }
    return { ok: true, content, sha: json.sha };
};

// Commits an updated category file back to GitHub. Passing the sha from the
// matching getCategoryFile() call means a concurrent change fails with 409
// instead of silently clobbering it.
const putCategoryFile = async (repo, branch, filePath, data, sha, message) => {
    const res = await githubRequest(`/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            content: Buffer.from(JSON.stringify(data, null, 4) + '\n', 'utf8').toString('base64'),
            sha,
            branch,
        }),
    });

    if (res.status === 409) {
        return { ok: false, status: 409, error: 'Datoteka je promijenjena u međuvremenu, pokušajte ponovno.' };
    }
    if (!res.ok) {
        const details = await res.text();
        return { ok: false, status: 502, error: 'Neuspješno spremanje promjena na GitHub.', details };
    }

    const json = await res.json();
    return { ok: true, commitUrl: json.commit?.html_url || null };
};

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

    const { action = 'add', category, questions, id, question } = req.body || {};
    const filename = CATEGORY_FILES[category];
    if (!filename) {
        res.status(400).json({ error: `Nepoznata kategorija: ${category}` });
        return;
    }

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
        res.status(500).json({ error: 'Server nije ispravno konfiguriran (nedostaje GITHUB_TOKEN/GITHUB_REPO).' });
        return;
    }
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = `src/data/categories/${filename}`;

    if (action === 'add') {
        const { valid, errors } = validateQuestions(questions);
        if (valid.length === 0) {
            res.status(400).json({ error: 'Nema ispravnih pitanja u datoteci.', invalid: errors });
            return;
        }

        const file = await getCategoryFile(repo, branch, filePath);
        if (!file.ok) {
            res.status(file.status).json({ error: file.error });
            return;
        }

        const { merged, added, skipped } = mergeQuestions(file.content, valid, category);
        if (added === 0) {
            res.status(200).json({
                added: 0,
                skipped,
                invalid: errors,
                total: file.content.length,
                message: 'Nema novih pitanja za dodati (sve su duplikati).',
            });
            return;
        }

        const commit = await putCategoryFile(
            repo, branch, filePath, merged, file.sha,
            `Add ${added} question(s) to ${category} via admin upload`
        );
        if (!commit.ok) {
            res.status(commit.status).json({ error: commit.error, details: commit.details });
            return;
        }

        res.status(200).json({ added, skipped, invalid: errors, total: merged.length, commitUrl: commit.commitUrl });
        return;
    }

    if (action === 'delete') {
        if (!id) {
            res.status(400).json({ error: 'Nedostaje ID pitanja.' });
            return;
        }

        const file = await getCategoryFile(repo, branch, filePath);
        if (!file.ok) {
            res.status(file.status).json({ error: file.error });
            return;
        }

        const { merged, removed } = removeQuestionById(file.content, id);
        if (!removed) {
            res.status(404).json({ error: `Pitanje s ID-om "${id}" nije pronađeno u kategoriji ${category}.` });
            return;
        }

        const commit = await putCategoryFile(
            repo, branch, filePath, merged, file.sha,
            `Remove ${id} from ${category} via admin panel`
        );
        if (!commit.ok) {
            res.status(commit.status).json({ error: commit.error, details: commit.details });
            return;
        }

        res.status(200).json({ removed: true, total: merged.length, commitUrl: commit.commitUrl });
        return;
    }

    if (action === 'edit') {
        if (!id || !question) {
            res.status(400).json({ error: 'Nedostaje ID ili podaci pitanja.' });
            return;
        }

        const file = await getCategoryFile(repo, branch, filePath);
        if (!file.ok) {
            res.status(file.status).json({ error: file.error });
            return;
        }

        const { merged, edited, reason } = editQuestionById(file.content, id, question);
        if (!edited) {
            res.status(400).json({ error: reason || 'Uređivanje nije uspjelo.' });
            return;
        }

        const commit = await putCategoryFile(
            repo, branch, filePath, merged, file.sha,
            `Edit ${id} in ${category} via admin panel`
        );
        if (!commit.ok) {
            res.status(commit.status).json({ error: commit.error, details: commit.details });
            return;
        }

        res.status(200).json({ edited: true, total: merged.length, commitUrl: commit.commitUrl });
        return;
    }

    res.status(400).json({ error: `Nepoznata akcija: ${action}` });
}
