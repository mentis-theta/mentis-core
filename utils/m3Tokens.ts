import React from 'react';
import { BRAND_COLORS } from './colorTokens';

export interface M3Tokens {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    pink: string;
    pinkContainer: string;
    amber: string;
    amberContainer: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    outline: string;
    outlineVariant: string;
    elevation1: string;
    elevation2: string;
    elevation3: string;
    // Shape (shared)
    shapeS: string;
    shapeM: string;
    shapeL: string;
    shapeXL: string;
    shapeRound: string;
    // Type scale (shared, as objects)
    typeTitleLarge: React.CSSProperties;
    typeTitleMedium: React.CSSProperties;
    typeTitleSmall: React.CSSProperties;
    typeBodyLarge: React.CSSProperties;
    typeBodyMedium: React.CSSProperties;
    typeBodySmall: React.CSSProperties;
    typeLabelLarge: React.CSSProperties;
    typeLabelMedium: React.CSSProperties;
    typeLabelSmall: React.CSSProperties;
}

const sharedShape = {
    shapeS: "8px",
    shapeM: "12px",
    shapeL: "16px",
    shapeXL: "28px",
    shapeRound: "50px",
};

const sharedType = {
    typeTitleLarge: { fontSize: "22px", fontWeight: "400", lineHeight: "28px", letterSpacing: "0px" },
    typeTitleMedium: { fontSize: "16px", fontWeight: "500", lineHeight: "24px", letterSpacing: "0.15px" },
    typeTitleSmall: { fontSize: "14px", fontWeight: "500", lineHeight: "20px", letterSpacing: "0.1px" },
    typeBodyLarge: { fontSize: "16px", fontWeight: "400", lineHeight: "24px", letterSpacing: "0.5px" },
    typeBodyMedium: { fontSize: "14px", fontWeight: "400", lineHeight: "20px", letterSpacing: "0.25px" },
    typeBodySmall: { fontSize: "12px", fontWeight: "400", lineHeight: "16px", letterSpacing: "0.4px" },
    typeLabelLarge: { fontSize: "14px", fontWeight: "500", lineHeight: "20px", letterSpacing: "0.1px" },
    typeLabelMedium: { fontSize: "12px", fontWeight: "500", lineHeight: "16px", letterSpacing: "0.5px" },
    typeLabelSmall: { fontSize: "11px", fontWeight: "500", lineHeight: "16px", letterSpacing: "0.5px" },
};

export const lightTokens: M3Tokens = {
    primary: "#2D6A4F",
    onPrimary: "#FFFFFF",
    primaryContainer: "#B7EBD6",
    onPrimaryContainer: "#00210F",
    secondary: "#4A6357",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#CDE8D9",
    onSecondaryContainer: "#062015",
    tertiary: "#3D6373",
    onTertiary: "#FFFFFF",
    tertiaryContainer: "#C1E8FA",
    onTertiaryContainer: "#001F2A",
    pink: "#D4607A",
    pinkContainer: "#FFE8EE",
    amber: "#B45309",
    amberContainer: "#FEF3C7",
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",
    surface: "#F6FBF7",
    onSurface: "#191C1A",
    surfaceVariant: "#DBE5DD",
    onSurfaceVariant: "#404943",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F0F5F1",
    surfaceContainer: "#E4EAE5",
    surfaceContainerHigh: "#DEE4DF",
    surfaceContainerHighest: "#D8DEDA",
    outline: "#707971",
    outlineVariant: "#BFC9C1",
    elevation1: "0px 1px 2px rgba(0,0,0,0.06), 0px 1px 3px 1px rgba(0,0,0,0.04)",
    elevation2: "0px 1px 2px rgba(0,0,0,0.08), 0px 2px 6px 2px rgba(0,0,0,0.06)",
    elevation3: "0px 4px 8px 3px rgba(0,0,0,0.08), 0px 1px 3px rgba(0,0,0,0.04)",
    ...sharedShape,
    ...sharedType,
};

export const darkTokens: M3Tokens = {
    primary: "#74D4A6",
    onPrimary: "#00391F",
    primaryContainer: "#1D5238",
    onPrimaryContainer: "#92F2C1",
    secondary: "#A0CDBA",
    onSecondary: "#1C3529",
    secondaryContainer: "#334B40",
    onSecondaryContainer: "#BCEACE",
    tertiary: "#A0CDE0",
    onTertiary: "#003546",
    tertiaryContainer: "#1E4D5F",
    onTertiaryContainer: "#C2E9FB",
    pink: "#F4A7B8",
    pinkContainer: "#5C1F30",
    amber: "#FCD48A",
    amberContainer: "#4A3000",
    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",
    surface: "#101411",
    onSurface: "#DFE4DF",
    surfaceVariant: "#3C4A3E",
    onSurfaceVariant: "#BCC9BC",
    surfaceContainerLowest: "#0B0F0C",
    surfaceContainerLow: "#191C1A",
    surfaceContainer: "#1D211E",
    surfaceContainerHigh: "#272B28",
    surfaceContainerHighest: "#323633",
    outline: "#869685",
    outlineVariant: "#3C4A3E",
    elevation1: "0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.2)",
    elevation2: "0px 1px 2px rgba(0,0,0,0.4), 0px 2px 6px 2px rgba(0,0,0,0.28)",
    elevation3: "0px 4px 8px 3px rgba(0,0,0,0.4), 0px 1px 3px rgba(0,0,0,0.2)",
    ...sharedShape,
    ...sharedType,
};

// --- Theta Theme Tokens ---
export const thetaLightTokens: M3Tokens = {
    primary: BRAND_COLORS.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: "#EBE3FF",
    onPrimaryContainer: "#1B0062",
    secondary: "#A98CF2",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#F3EFFF",
    onSecondaryContainer: "#21005D",
    tertiary: "#9ED6C9", // Therapeutic color
    onTertiary: "#003730",
    tertiaryContainer: "#BAF3E5",
    onTertiaryContainer: "#00201B",
    pink: "#D4607A",
    pinkContainer: "#FFE8EE",
    amber: "#B45309",
    amberContainer: "#FEF3C7",
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",
    surface: "#F7F8FB",
    onSurface: "#2F3440",
    surfaceVariant: "#E8E9EC",
    onSurfaceVariant: "#6E7683",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F1F2F5",
    surfaceContainer: "#E2E4E9",
    surfaceContainerHigh: "#D7DAE0",
    surfaceContainerHighest: "#CDD1D9",
    outline: "#D6DBE3",
    outlineVariant: "#BFC4CD",
    elevation1: "0px 1px 2px rgba(108, 62, 220, 0.08), 0px 1px 3px 1px rgba(108, 62, 220, 0.05)",
    elevation2: "0px 1px 2px rgba(108, 62, 220, 0.1), 0px 2px 6px 2px rgba(108, 62, 220, 0.08)",
    elevation3: "0px 4px 8px 3px rgba(108, 62, 220, 0.12), 0px 1px 3px rgba(108, 62, 220, 0.05)",
    ...sharedShape,
    ...sharedType,
};

export const thetaDarkTokens: M3Tokens = {
    primary: BRAND_COLORS.primaryGlow,
    onPrimary: "#381E72",
    primaryContainer: "#4F378B",
    onPrimaryContainer: "#EADDFF",
    secondary: "#CCC2DC",
    onSecondary: "#332D41",
    secondaryContainer: "#4A4458",
    onSecondaryContainer: "#E8DEF8",
    tertiary: "#9ED6C9",
    onTertiary: "#003730",
    tertiaryContainer: "#1D5046",
    onTertiaryContainer: "#BAF3E5",
    pink: "#F4A7B8",
    pinkContainer: "#5C1F30",
    amber: "#FCD48A",
    amberContainer: "#4A3000",
    error: "#F2B8B5",
    onError: "#601410",
    errorContainer: "#8C1D18",
    onErrorContainer: "#F9DEDC",
    surface: "#1C1B1F",
    onSurface: "#E6E1E5",
    surfaceVariant: "#49454F",
    onSurfaceVariant: "#CAC4D0",
    surfaceContainerLowest: "#0F0D13",
    surfaceContainerLow: "#1D1B20",
    surfaceContainer: "#211F26",
    surfaceContainerHigh: "#2B2930",
    surfaceContainerHighest: "#36343B",
    outline: "#938F99",
    outlineVariant: "#49454F",
    elevation1: "0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.2)",
    elevation2: "0px 1px 2px rgba(0,0,0,0.4), 0px 2px 6px 2px rgba(0,0,0,0.28)",
    elevation3: "0px 4px 8px 3px rgba(0,0,0,0.4), 0px 1px 3px rgba(0,0,0,0.2)",
    ...sharedShape,
    ...sharedType,
};
