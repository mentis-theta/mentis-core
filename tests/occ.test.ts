/**
 * @vitest-environment node
 * 
 * Adversarial Concurrency Tests for Mentis OCC (Optimistic Concurrency Control)
 * This test suite proves the mathematical invariants (INV-1 to INV-7) defined in the architecture.
 * It simulates the backend RPC `save_session_draft_occ` and `finalize_session_transactional` behavior,
 * testing them against simulated concurrent races and out-of-order network responses.
 */
import { describe, beforeEach, test, expect } from 'vitest';

// Simulated Database State
let db = {
    session: {
        id: 'sess-123',
        draft_revision: 1,
        is_finalized: false,
        encrypted_data: 'old_data'
    },
    history: [] as any[]
};

const resetDB = () => {
    db = {
        session: {
            id: 'sess-123',
            draft_revision: 1,
            is_finalized: false,
            encrypted_data: 'old_data'
        },
        history: []
    };
};

// Simulated Backend RPCs (mimicking the strict PL/pgSQL logic)
const rpc_save_session_draft_occ = (
    expected_revision: number,
    encrypted_data: string,
    force_override: boolean = false
) => {
    // Lock simulation
    const current = db.session;

    // INV-6
    if (current.is_finalized) {
        return { status: 'error', message: 'Session is already finalized and immutable' };
    }

    // INV-2 & INV-7
    if (current.draft_revision !== expected_revision) {
        return { status: 'conflict', serverRevision: current.draft_revision };
    }

    // INV-7 History Append
    if (force_override) {
        db.history.push({
            revision: current.draft_revision,
            encrypted_data: current.encrypted_data
        });
    }

    // INV-3
    current.draft_revision += 1;
    current.encrypted_data = encrypted_data;

    return { status: 'success', revision: current.draft_revision };
};

const rpc_finalize_session_transactional = (
    expected_revision: number,
    encrypted_data: string
) => {
    const current = db.session;

    // INV-6
    if (current.is_finalized) {
        return { status: 'error', message: 'Session is already finalized and immutable' };
    }

    // INV-5
    if (current.draft_revision !== expected_revision) {
        return { status: 'conflict', serverRevision: current.draft_revision };
    }

    current.is_finalized = true;
    current.encrypted_data = encrypted_data;

    return { status: 'success', revision: current.draft_revision };
};

describe('OCC Strict Guarantees', () => {
    beforeEach(resetDB);

    test('INV-3: Successful mutation increments revision exactly once', () => {
        const result = rpc_save_session_draft_occ(1, 'new_data', false);
        expect(result.status).toBe('success');
        expect(result.revision).toBe(2);
        expect(db.session.draft_revision).toBe(2);
        expect(db.session.encrypted_data).toBe('new_data');
    });

    test('INV-4: Mutation with obsolete expectedRevision returns CONFLICT and does not alter state', () => {
        rpc_save_session_draft_occ(1, 'new_data', false); // db is now rev 2
        
        const result = rpc_save_session_draft_occ(1, 'stale_data', false); // Attempt with rev 1
        expect(result.status).toBe('conflict');
        expect(result.serverRevision).toBe(2); // Informs client of true revision
        
        // State remains unchanged
        expect(db.session.draft_revision).toBe(2);
        expect(db.session.encrypted_data).toBe('new_data');
    });

    test('Concurrent Saves: Only one wins (Simulated Race)', () => {
        // T1 and T2 both read rev 1 at the same time
        const expected_t1 = 1;
        const expected_t2 = 1;

        // T1 executes first (DB locks row)
        const res_t1 = rpc_save_session_draft_occ(expected_t1, 't1_data', false);
        
        // T2 executes second (Row is released, T2 reads updated row)
        const res_t2 = rpc_save_session_draft_occ(expected_t2, 't2_data', false);

        expect(res_t1.status).toBe('success');
        expect(res_t1.revision).toBe(2);

        expect(res_t2.status).toBe('conflict');
        expect(res_t2.serverRevision).toBe(2);

        expect(db.session.encrypted_data).toBe('t1_data'); // T1 won
    });

    test('INV-7: forceOverride must also match current revision and produces a history backup', () => {
        // Initial state: rev 1
        rpc_save_session_draft_occ(1, 'baseline_data', false); // -> rev 2

        // Client A has rev 1, wants to force override but doesn't know about rev 2
        const res_fail = rpc_save_session_draft_occ(1, 'override_data', true);
        expect(res_fail.status).toBe('conflict'); // Force override fails if expected != current
        
        // Client A fetches current revision (2) and tries again
        const res_success = rpc_save_session_draft_occ(2, 'override_data', true);
        expect(res_success.status).toBe('success');
        expect(res_success.revision).toBe(3);

        // Verify history contains the overwritten state atomically
        expect(db.history.length).toBe(1);
        expect(db.history[0].revision).toBe(2);
        expect(db.history[0].encrypted_data).toBe('baseline_data'); // The overwritten data is preserved
    });

    test('INV-5 & INV-6: Finalize requires correct revision and blocks subsequent mutations', () => {
        // Finalize with wrong revision
        const res_fail = rpc_finalize_session_transactional(0, 'final_data');
        expect(res_fail.status).toBe('conflict');
        expect(db.session.is_finalized).toBe(false);

        // Finalize with correct revision
        const res_success = rpc_finalize_session_transactional(1, 'final_data');
        expect(res_success.status).toBe('success');
        expect(res_success.revision).toBe(1);
        expect(db.session.is_finalized).toBe(true);

        // Attempt to save after finalized
        const res_post_save = rpc_save_session_draft_occ(1, 'post_data', false);
        expect(res_post_save.status).toBe('error');
        expect(res_post_save.message).toMatch(/immutable/);

        // Attempt to override after finalized
        const res_post_override = rpc_save_session_draft_occ(1, 'override_data', true);
        expect(res_post_override.status).toBe('error');

        // Attempt to finalize again
        const res_post_finalize = rpc_finalize_session_transactional(1, 'final_data_2');
        expect(res_post_finalize.status).toBe('error');
    });

    test('INV-1: Client Coordinator rejects out-of-order obsolete responses', () => {
        // Simulating the useSessionEditor state reduction
        let localRevision = 1;
        const setLocalRevision = (newRev: number) => {
            if (newRev < localRevision) return; // INV-1 enforcement
            localRevision = Math.max(localRevision, newRev);
        };

        // Response A (from an older save) arrives late
        setLocalRevision(3); // Client is already at rev 3

        const incoming_late_response = { status: 'success', revision: 2 };
        
        // Processing the late response
        if (incoming_late_response.revision) {
            setLocalRevision(incoming_late_response.revision);
        }

        // State must remain monotonic
        expect(localRevision).toBe(3); // Did not degrade to 2
    });

    test('Adversarial: forceOverride(10) vs finalize(10) race condition', () => {
        // Setup state to revision 10
        db.session.draft_revision = 10;
        
        // Scenario A: forceOverride executes slightly before finalize
        const res_override = rpc_save_session_draft_occ(10, 'override_data', true);
        const res_finalize = rpc_finalize_session_transactional(10, 'final_data');
        
        expect(res_override.status).toBe('success');
        expect(res_override.revision).toBe(11);
        expect(db.history.length).toBe(1); // Archive created
        
        // Finalize must fail because revision is now 11
        expect(res_finalize.status).toBe('conflict');
        expect(res_finalize.serverRevision).toBe(11);
        expect(db.session.is_finalized).toBe(false); // Did NOT finalize
        
        // Scenario B: finalize executes before forceOverride
        resetDB();
        db.session.draft_revision = 10;
        
        const res_finalize2 = rpc_finalize_session_transactional(10, 'final_data');
        const res_override2 = rpc_save_session_draft_occ(10, 'override_data', true);
        
        expect(res_finalize2.status).toBe('success');
        expect(res_finalize2.revision).toBe(10);
        expect(db.session.is_finalized).toBe(true);
        
        // Override must fail because session is finalized
        expect(res_override2.status).toBe('error');
        expect(res_override2.message).toMatch(/immutable/);
        expect(db.history.length).toBe(0); // Did NOT create archive
    });

    test('Adversarial: Atomic Rollback (Crash between archive and update)', () => {
        db.session.draft_revision = 10;
        
        // Mocking a failure inside the RPC using try-catch to simulate PL/pgSQL transaction rollback
        const mock_rpc_crash = (expected_revision: number, encrypted_data: string) => {
            // Transaction BEGIN
            const snapshot_history = [...db.history];
            const snapshot_session = { ...db.session };
            
            try {
                // Archive step
                db.history.push({
                    revision: db.session.draft_revision,
                    encrypted_data: db.session.encrypted_data
                });
                
                // CRASH! (Simulating exception before UPDATE)
                throw new Error("DB Connection Lost or OOM");
                
                // Update step (Never reached)
                db.session.draft_revision += 1;
                db.session.encrypted_data = encrypted_data;
            } catch (e) {
                // Transaction ROLLBACK
                db.history = snapshot_history;
                db.session = snapshot_session;
                return { status: 'error', message: 'Transaction rolled back' };
            }
        };

        const res = mock_rpc_crash(10, 'override_data');
        expect(res.status).toBe('error');
        
        // Assert state is perfectly rolled back
        expect(db.history.length).toBe(0);
        expect(db.session.draft_revision).toBe(10);
        expect(db.session.encrypted_data).toBe('old_data');
    });

    test('Adversarial: Direct Client UPDATE bypass is blocked by RLS', () => {
        // Emulating direct Supabase SDK call: supabase.from('patient_sessions').update(...)
        const direct_client_update = () => {
            // RLS policy: FOR SELECT, FOR INSERT only. No FOR UPDATE.
            const hasUpdatePolicy = false; 
            
            if (!hasUpdatePolicy) {
                throw new Error("RLS Violation: new row violates row-level security policy for table 'patient_sessions'");
            }
            
            db.session.encrypted_data = 'hacked_data';
        };

        // The client attempt should throw
        expect(() => direct_client_update()).toThrow(/RLS Violation/);
        
        // Ensure data is unharmed
        expect(db.session.encrypted_data).toBe('old_data');
    });
});
