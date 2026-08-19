import CryptoJS from 'crypto-js';
import * as bip39 from 'bip39';

// --- Types ---

export interface MasterKey {
    key: string; // The actual 32-byte key (hex string)
}

export interface EncryptedData {
    ciphertext: string; // The encrypted blob
}

// --- Constants ---

const KEY_SIZE = 256 / 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations (High security)
const SALT_SIZE = 128 / 8; // 16 bytes

// --- Key Management ---

/**
 * Generates a random 256-bit Master Key.
 */
export const generateMasterKey = (): string => {
    return CryptoJS.lib.WordArray.random(KEY_SIZE * 4).toString();
};

/**
 * Generates a random Salt.
 */
export const generateSalt = (): string => {
    return CryptoJS.lib.WordArray.random(SALT_SIZE).toString();
};

/**
 * Derives a Key Encryption Key (KEK) from the user's password and a salt.
 * This key is used ONLY to encrypt/decrypt the Master Key.
 */
export const deriveKeyFromPassword = (password: string, salt: string): string => {
    return CryptoJS.PBKDF2(password, salt, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS,
    }).toString();
};

/**
 * Wraps (Encrypts) the Master Key using the Password-Derived Key (KEK).
 */
export const wrapKey = (masterKey: string, kek: string): string => {
    return CryptoJS.AES.encrypt(masterKey, kek).toString();
};

/**
 * Unwraps (Decrypts) the Master Key using the Password-Derived Key (KEK).
 * Throws error if password is wrong (decryption fails).
 */
export const unwrapKey = (wrappedKey: string, kek: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(wrappedKey, kek);
        const originalKey = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalKey) {
            throw new Error('Falha na descriptografia. Senha incorreta ou dados corrompidos.');
        }
        return originalKey;
    } catch (e) {
        throw new Error('Falha na descriptografia. Senha incorreta ou dados corrompidos.');
    }
};

// --- Recovery Management (BIP39 Legacy & Recovery Code) ---

/**
 * Generates a 16-character alphanumeric Recovery Code (XXXX-XXXX-XXXX-XXXX).
 */
export const generateRecoveryCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const randomArray = new Uint8Array(16);
    crypto.getRandomValues(randomArray);
    for (let i = 0; i < 16; i++) {
        code += chars[randomArray[i] % chars.length];
    }
    // Format as XXXX-XXXX-XXXX-XXXX
    return code.match(/.{1,4}/g)?.join('-') || code;
};

/**
 * Derives a strong AES key from the Recovery Code using PBKDF2.
 */
export const deriveKeyFromRecoveryCode = (code: string, salt: string): string => {
    // Normalize code: uppercase and remove spaces/dashes
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // PBKDF2 with 100,000 iterations
    return CryptoJS.PBKDF2(normalizedCode, salt, {
        keySize: KEY_SIZE,
        iterations: ITERATIONS
    }).toString();
};

/**
 * (LEGACY) Generates a 12-word recovery phrase.
 */
export const generateRecoveryPhrase = (): string => {
    bip39.setDefaultWordlist('portuguese');
    return bip39.generateMnemonic(128);
};

/**
 * (LEGACY) Derives a strong AES key from the 12-word mnemonic.
 */
export const deriveKeyFromMnemonic = (mnemonic: string): string => {
    bip39.setDefaultWordlist('portuguese');
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Frase de recuperação inválida.');
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic).toString('hex');
    return CryptoJS.SHA256(seed).toString();
};

/**
 * Creates a recovery envelope. Uses PBKDF2 with Recovery Code by default.
 */
export const createRecoveryEnvelope = (masterKey: string, recoveryInput: string, salt?: string): string => {
    // If it looks like a 12-word phrase (legacy fallback for tests/old flows)
    if (recoveryInput.split(' ').length === 12) {
        const recoveryKey = deriveKeyFromMnemonic(recoveryInput);
        return CryptoJS.AES.encrypt(masterKey, recoveryKey).toString();
    }
    
    // New Recovery Code flow
    if (!salt) throw new Error('Salt is required for Recovery Code derivation.');
    const recoveryKey = deriveKeyFromRecoveryCode(recoveryInput, salt);
    return CryptoJS.AES.encrypt(masterKey, recoveryKey).toString();
};

/**
 * Unwraps the Master Key using either a legacy 12-word phrase or a new Recovery Code.
 */
export const recoverMasterKey = (recoveryInput: string, recoveryEnvelope: string, salt?: string): string => {
    try {
        let recoveryKey: string;
        
        // Detect if legacy BIP39 phrase
        if (recoveryInput.trim().includes(' ') && recoveryInput.trim().split(/\s+/).length === 12) {
            recoveryKey = deriveKeyFromMnemonic(recoveryInput);
        } else {
            // New Recovery Code
            if (!salt) throw new Error('Salt is required for Recovery Code derivation.');
            recoveryKey = deriveKeyFromRecoveryCode(recoveryInput, salt);
        }
        
        const bytes = CryptoJS.AES.decrypt(recoveryEnvelope, recoveryKey);
        const originalKey = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalKey) {
            throw new Error('Código/Frase incorreta ou dados corrompidos.');
        }
        return originalKey;
    } catch (error) {
        throw new Error('Código/Frase incorreta ou dados corrompidos.');
    }
};

// --- Data Encryption (AES-GCM equivalent using AES-CBC for CryptoJS limitation or standard AES) ---
// Note: CryptoJS default is AES-CBC. For higher security in browser without heavy libs, 
// we stick to standard AES. Ideally we'd use WebCrypto API for AES-GCM, 
// but for compatibility and speed of implementation with existing stack (CryptoJS), we use AES.

/**
 * Encrypts a JSON object or string using the Master Key.
 */
export const encryptData = (data: any, masterKey: string): string => {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, masterKey).toString();
};

/**
 * Decrypts data using the Master Key.
 */
export const decryptData = <T>(encryptedData: string, masterKey: string): T => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) throw new Error('Decryption failed');
    return JSON.parse(decryptedString);
};

// --- Blind Indexing ---

/**
 * Generates a deterministic hash (HMAC) of a string for searching.
 * We normalize the text (lowercase, trim) before hashing to allow case-insensitive exact match.
 */
export const generateBlindIndex = (text: string, masterKey: string): string => {
    const normalized = text.toLowerCase().trim();
    return CryptoJS.HmacSHA256(normalized, masterKey).toString();
};

// --- Asymmetric Cryptography (RSA-OAEP for E2E Practices) ---
// The code to append to cryptoService.ts

// --- Asymmetric Cryptography (RSA-OAEP for E2E Practices) ---
// Using Web Crypto API for native browser asymmetric cryptography.

/**
 * Generates an RSA-OAEP Key Pair (Public and Private keys).
 * Returns the keys in JWK (JSON) string format so they can be easily stored.
 */
export const generateAsymmetricKeyPair = async (): Promise<{ publicKey: string, privateKey: string }> => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
        publicKey: JSON.stringify(publicKeyJwk),
        privateKey: JSON.stringify(privateKeyJwk)
    };
};

/**
 * Encrypts data using a Public Key (JWK string).
 * The server and patient can use this to encrypt data for the therapist.
 */
export const encryptAsymmetric = async (data: any, publicKeyStr: string): Promise<string> => {
    const publicKeyJwk = JSON.parse(publicKeyStr);
    
    const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        publicKeyJwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );

    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(jsonString);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicKey,
        encodedData
    );

    // Convert ArrayBuffer to Base64 for storage
    const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
    const base64Str = btoa(String.fromCharCode.apply(null, encryptedArray));
    return base64Str;
};

/**
 * Decrypts data using a Private Key (JWK string).
 * Only the therapist can do this using their locally decrypted private key.
 */
export const decryptAsymmetric = async <T>(encryptedBase64: string, privateKeyStr: string): Promise<T> => {
    const privateKeyJwk = JSON.parse(privateKeyStr);
    
    const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["decrypt"]
    );

    // Convert Base64 to ArrayBuffer
    const binaryStr = atob(encryptedBase64);
    const encryptedBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        encryptedBytes[i] = binaryStr.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        encryptedBytes
    );

    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    
    if (!decryptedString) throw new Error('Asymmetric decryption failed');
    let parsed = JSON.parse(decryptedString);
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    return parsed;
};

