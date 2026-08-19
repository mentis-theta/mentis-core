import React, { useState, useEffect, createContext, useContext } from 'react';
import { M3Tokens, lightTokens, darkTokens, thetaLightTokens, thetaDarkTokens } from '@/utils/m3Tokens';

type Theme = 'light' | 'dark';
type ThemeMode = 'theta' | 'classic';

interface ThemeContextType {
    theme: Theme;
    themeMode: ThemeMode;
    isDark: boolean;
    M3: M3Tokens;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    themeMode: 'theta',
    isDark: false,
    M3: thetaLightTokens,
    toggleTheme: () => { },
    setThemeMode: () => { }
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            return saved === 'dark' ? 'dark' : 'light';
        }
        return 'light';
    });

    const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mentis_theme_mode');
            return (saved === 'classic' || saved === 'theta') ? saved : 'theta';
        }
        return 'theta';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-theme', themeMode);
        localStorage.setItem('mentis_theme_mode', themeMode);
    }, [themeMode]);

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
    const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);

    const isDark = theme === 'dark';

    // Select tokens based on theme and mode
    const getTokens = () => {
        if (themeMode === 'theta') {
            return isDark ? thetaDarkTokens : thetaLightTokens;
        }
        return isDark ? darkTokens : lightTokens;
    };

    const M3 = getTokens();

    return (
        <ThemeContext.Provider value={{ theme, themeMode, isDark, M3, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
