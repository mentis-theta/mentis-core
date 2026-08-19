import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CryptoContextType {
    masterKey: string | null;
    isLocked: boolean;
    unlockVault: (key: string) => void;
    lockVault: () => void;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export const CryptoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterKey, setMasterKey] = useState<string | null>(() => {
        return sessionStorage.getItem('mentis_mk');
    });

    const unlockVault = useCallback((key: string) => {
        setMasterKey(key);
        sessionStorage.setItem('mentis_mk', key);
    }, []);

    const lockVault = useCallback(() => {
        setMasterKey(null);
        sessionStorage.removeItem('mentis_mk');
    }, []);

    return (
        <CryptoContext.Provider
            value={{
                masterKey,
                isLocked: !masterKey,
                unlockVault,
                lockVault,
            }}
        >
            {children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => {
    const context = useContext(CryptoContext);
    if (context === undefined) {
        throw new Error('useCrypto must be used within a CryptoProvider');
    }
    return context;
};
