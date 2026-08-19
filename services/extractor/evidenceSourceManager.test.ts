import { describe, it, expect } from 'vitest';
import { extractSessionEvidence } from './evidenceSourceManager';
import { Session } from '../../types';

describe('evidenceSourceManager', () => {
    const baseSession: Partial<Session> = {
        id: 'test-session',
        date: new Date().toISOString(),
        duration: 50,
        sessionType: 'individual',
        paymentStatus: 'pending',
        price: 150,
        tags: [],
        goalIds: [],
        attachments: [],
        status: 'draft',
    };

    it('returns HIGH quality notes when completed, finalized, and under 15k chars', () => {
        const session = {
            ...baseSession,
            status: 'completed' as const,
            finalized_at: new Date().toISOString(),
            notes: 'Evolução clínica validada pelo profissional.',
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('notes');
        expect(evidence.quality).toBe('HIGH');
        expect(evidence.wasFallback).toBe(false);
        expect(evidence.wasChunked).toBe(false);
        expect(evidence.extractionText).toBe('Evolução clínica validada pelo profissional.');
    });

    it('falls back to summary if notes is > 15k, even if completed', () => {
        const longText = 'a'.repeat(16000);
        const session = {
            ...baseSession,
            status: 'completed' as const,
            finalized_at: new Date().toISOString(),
            notes: longText,
            resumo_sessao: 'Resumo estruturado por IA.'
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('summary');
        expect(evidence.quality).toBe('HIGH');
        expect(evidence.extractionText).toBe('Resumo estruturado por IA.');
    });

    it('falls back to transcript (chunked) if notes is > 15k and no summary exists', () => {
        const longText = 'a'.repeat(16000);
        const session = {
            ...baseSession,
            status: 'completed' as const,
            finalized_at: new Date().toISOString(),
            notes: longText,
            transcript: longText
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('transcript');
        expect(evidence.quality).toBe('LOW');
        expect(evidence.wasChunked).toBe(true);
        expect(evidence.wasFallback).toBe(true);
        expect(evidence.fallbackReason).toBe('notes_too_large');
        expect(evidence.extractionText).toBe(longText);
    });

    it('returns HIGH quality summary when notes are draft', () => {
        const session = {
            ...baseSession,
            status: 'draft' as const,
            notes: 'Rascunho não finalizado.',
            resumo_sessao: 'Resumo estruturado por IA.'
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('summary');
        expect(evidence.quality).toBe('HIGH');
        expect(evidence.extractionText).toBe('Resumo estruturado por IA.');
    });

    it('returns MEDIUM quality draft when no summary exists', () => {
        const session = {
            ...baseSession,
            status: 'draft' as const,
            notes: 'Rascunho não finalizado.',
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('draft');
        expect(evidence.quality).toBe('MEDIUM');
        expect(evidence.wasFallback).toBe(true);
        expect(evidence.fallbackReason).toBe('summary_missing');
    });

    it('handles empty session correctly (returns LOW quality notes)', () => {
        const session = {
            ...baseSession,
            notes: ''
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('notes');
        expect(evidence.quality).toBe('LOW');
        expect(evidence.wasFallback).toBe(true);
        expect(evidence.fallbackReason).toBe('transcript_only');
    });

    it('returns transcript when only transcript is available', () => {
        const session = {
            ...baseSession,
            transcript: 'Isto é uma transcrição.',
        } as Session;

        const evidence = extractSessionEvidence(session);
        expect(evidence.source).toBe('transcript');
        expect(evidence.quality).toBe('LOW');
        expect(evidence.wasFallback).toBe(true);
        expect(evidence.fallbackReason).toBe('transcript_only');
    });
});
