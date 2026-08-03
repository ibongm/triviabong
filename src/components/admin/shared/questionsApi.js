import { auth } from '../../../services/firebase';

// Single entry point for the three admin writes that go through
// /api/questions (upload, edit, delete). They all need the same Firebase ID
// token, the same headers, and the same "did it come back ok" branch - keeping
// that in one place means a change to the auth header or the server's error
// shape is one edit rather than three that have to stay in sync.
//
// Never throws: network failures come back as { ok: false } with a Croatian
// message, same as a non-2xx response, so callers have exactly one shape to
// render.
export async function postQuestionsApi(body, networkErrorText) {
    try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            return { ok: false, error: data.error, data };
        }
        return { ok: true, data };
    } catch {
        return { ok: false, error: networkErrorText, data: null };
    }
}
