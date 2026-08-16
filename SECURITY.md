# Security Policy & Vulnerability Management

## Accepted Residual Risks & Dependency Notes

### 1. `firebase-tools` transitive dependencies (`@opentelemetry/core`, `uuid`)
- **Severity**: Moderate
- **Status**: Accepted risk
- **Details**: `firebase-tools`'s `@opentelemetry/core` and `uuid` transitive advisories are accepted as-is: `firebase-tools` is a devDependency used only for local Firebase Emulator sessions, never runs in the deployed app or production bundle, and the only available automated fix is a breaking major-version downgrade (`npm audit fix --force` offers `14.23.0`). Re-evaluate when `firebase-tools` ships an update that resolves these without a downgrade.

### 2. `uuid` dependency resolution
- **Status**: Remediated via npm `overrides` (`"uuid": "^11.1.1"` in `package.json`).
- **Details**: Resolved transitive `uuid` vulnerability across `firebase-admin` and `firebase-tools` chains. All unit tests and production builds execute with `uuid@11.1.1`.

---

## Future Recommendations

### Content-Security-Policy (CSP)
A scoped CSP should be tested and implemented on Vercel headers with explicit permissions for:
- Firebase Auth popups/redirects: `https://accounts.google.com`, `https://*.firebaseapp.com`
- Firestore WebChannel/REST endpoints: `https://*.googleapis.com`, `https://*.firebaseio.com`
- Client asset origins and CDNs.
