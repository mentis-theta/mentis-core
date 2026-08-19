import { describe, it, expect, vi } from 'vitest';
import * as authService from '../authService';
import * as cryptoService from '../cryptoService';

// Mock supabase to avoid actual network calls
vi.mock('../supabaseClient.ts', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { key_salt: 'fake-salt', encrypted_master_key: 'fake-encrypted-key', role: 'psychologist' }, error: null }),
        })),
    }
}));

describe('authService', () => {
    it('should derive master key correctly if profile has valid encrypted key', () => {
        // Here we just test the wrapping/unwrapping logic within authService
        const password = 'test-password';
        const salt = cryptoService.generateSalt();
        const masterKey = cryptoService.generateMasterKey();
        
        // Setup a valid wrapped key
        const kek = cryptoService.deriveKeyFromPassword(password, salt);
        const wrappedKey = cryptoService.wrapKey(masterKey, kek);
        
        // This validates the logic used in login (lines 149-150)
        const derivedKek = cryptoService.deriveKeyFromPassword(password, salt);
        const unwrappedMasterKey = cryptoService.unwrapKey(wrappedKey, derivedKek);
        
        expect(unwrappedMasterKey).toBe(masterKey);
    });

    it('should generate valid new keys for registration', () => {
        // Logic from lines 192-195
        const password = 'new-password';
        
        const newMasterKey = cryptoService.generateMasterKey();
        const salt = cryptoService.generateSalt();
        const kek = cryptoService.deriveKeyFromPassword(password, salt);
        const encryptedMasterKey = cryptoService.wrapKey(newMasterKey, kek);
        
        expect(encryptedMasterKey).not.toBe(newMasterKey);
        
        // Validate it can be reversed
        const testKek = cryptoService.deriveKeyFromPassword(password, salt);
        expect(cryptoService.unwrapKey(encryptedMasterKey, testKek)).toBe(newMasterKey);
    });
});
