import { describe, it, expect } from 'vitest';
import { REPORT_REASONS, availableReportReasons, reportReasonLabel } from './reportReasons';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rules = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../firestore.rules'), 'utf8');

describe('availableReportReasons', () => {
    it('hides "wrong explanation" when the feature is off', () => {
        const ids = availableReportReasons({ explanation: 'x' }, false).map((r) => r.id);
        expect(ids).not.toContain('wrong_explanation');
    });

    it('hides it for a question without an explanation', () => {
        const ids = availableReportReasons({ id: 'q' }, true).map((r) => r.id);
        expect(ids).not.toContain('wrong_explanation');
    });

    it('offers it for a question with an explanation when the feature is on', () => {
        const ids = availableReportReasons({ explanation: 'x' }, true).map((r) => r.id);
        expect(ids).toContain('wrong_explanation');
    });

    it('keeps the default (first) reason unchanged', () => {
        expect(availableReportReasons(null, false)[0].id).toBe(REPORT_REASONS[0].id);
    });

    it('labels the new reason for the admin queue', () => {
        expect(reportReasonLabel('wrong_explanation')).toBe('Objašnjenje je netočno');
    });
});

describe('firestore.rules stays in sync', () => {
    it('allows every reason id the app can send', () => {
        for (const r of REPORT_REASONS) expect(rules).toContain(`'${r.id}'`);
    });

    it('caps submission explanations at the same length as the app', () => {
        expect(rules).toContain('explanation.size() <= 220');
    });
});
