import { describe, it, expect } from 'vitest';
import * as cryptoService from '../cryptoService';

describe('cryptoService', () => {
    it('should generate a master key and salt', () => {
        const masterKey = cryptoService.generateMasterKey();
        const salt = cryptoService.generateSalt();
        
        expect(masterKey).toBeDefined();
        expect(masterKey.length).toBeGreaterThan(0);
        expect(salt).toBeDefined();
        expect(salt.length).toBeGreaterThan(0);
    });

    it('should derive a consistent KEK from password and salt', () => {
        const password = 'my-secure-password';
        const salt = cryptoService.generateSalt();
        
        const kek1 = cryptoService.deriveKeyFromPassword(password, salt);
        const kek2 = cryptoService.deriveKeyFromPassword(password, salt);
        
        expect(kek1).toBe(kek2);
        
        const wrongKek = cryptoService.deriveKeyFromPassword('wrong-password', salt);
        expect(kek1).not.toBe(wrongKek);
    });

    it('should wrap and unwrap a master key correctly', () => {
        const masterKey = cryptoService.generateMasterKey();
        const password = 'super-secret-password';
        const salt = cryptoService.generateSalt();
        const kek = cryptoService.deriveKeyFromPassword(password, salt);
        
        // Wrap
        const wrappedKey = cryptoService.wrapKey(masterKey, kek);
        expect(wrappedKey).not.toBe(masterKey);
        
        // Unwrap
        const unwrappedKey = cryptoService.unwrapKey(wrappedKey, kek);
        expect(unwrappedKey).toBe(masterKey);
    });

    it('should fail to unwrap with wrong KEK', () => {
        const masterKey = cryptoService.generateMasterKey();
        const kek = cryptoService.deriveKeyFromPassword('pass1', 'salt');
        const wrongKek = cryptoService.deriveKeyFromPassword('pass2', 'salt');
        
        const wrappedKey = cryptoService.wrapKey(masterKey, kek);
        
        expect(() => {
            cryptoService.unwrapKey(wrappedKey, wrongKek);
        }).toThrow(/Falha na descriptografia/i);
    });

    it('should encrypt and decrypt data properly and perfectly reversible', () => {
        const masterKey = cryptoService.generateMasterKey();
        const payload = { 
            patientName: 'José', 
            notes: 'Paciente apresentou melhora',
            sessionValue: 150.50
        };
        
        const ciphertext = cryptoService.encryptData(payload, masterKey);
        expect(ciphertext).not.toContain('José');
        
        const decrypted = cryptoService.decryptData<typeof payload>(ciphertext, masterKey);
        expect(decrypted).toEqual(payload);
    });

    it('should fail to decrypt with wrong master key', () => {
        const masterKey = cryptoService.generateMasterKey();
        const wrongKey = cryptoService.generateMasterKey();
        const payload = { test: 'secret' };
        
        const ciphertext = cryptoService.encryptData(payload, masterKey);
        
        expect(() => {
            cryptoService.decryptData(ciphertext, wrongKey);
        }).toThrow();
    });

    it('should generate consistent blind indexes', () => {
        const masterKey = cryptoService.generateMasterKey();
        
        const index1 = cryptoService.generateBlindIndex('João da Silva', masterKey);
        const index2 = cryptoService.generateBlindIndex('  joão da silva  ', masterKey);
        
        expect(index1).toBe(index2);
        
        const index3 = cryptoService.generateBlindIndex('Maria', masterKey);
        expect(index1).not.toBe(index3);
    });
});
