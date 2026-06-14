/**
 * Type augmentation for custom antd theme tokens.
 *
 * Extends antd's AliasToken so that all custom tokens defined in
 * src/config/antd-theme.ts are recognized by TypeScript.
 *
 * @see src/config/antd-theme.ts for token definitions
 */
import 'antd/es/theme/interface/alias';

declare module 'antd/es/theme/interface/alias' {
  interface AliasToken {
    // ─── Purple Palette ────────────────────────────────────────────
    colorPurple: string;
    colorPurpleBg: string;
    colorPurpleBorder: string;
    colorPurpleHover: string;
    colorPurpleActive: string;
    colorPurpleText: string;
    colorPurpleTextHover: string;

    // ─── Teal Palette ──────────────────────────────────────────────
    colorTealAccent: string;
    colorTealBg: string;
    colorTealDeepBg: string;
    colorTealBorder: string;
    colorTealHover: string;
    colorTealActive: string;
    colorTealText: string;

    // ─── Sidebar ───────────────────────────────────────────────────
    colorSidebarBg: string;
    colorSidebarBorder: string;
    colorSidebarItemActive: string;
    colorSidebarItemHover: string;

    // ─── Sidebar Dark (app-shell) ──────────────────────────────────
    colorSidebarBgDark: string;
    colorSidebarBorderDark: string;
    colorSidebarTextDark: string;
    colorSidebarTextSecondaryDark: string;

    // ─── Code / Syntax Highlighting ────────────────────────────────
    colorCodeBg: string;
    colorCodeText: string;
    colorCodeHighlight: string;
    colorCodeAnnotation: string;
    colorCodeString: string;
    colorCodeKeyword: string;
    colorCodeFunction: string;
    colorCodeVariable: string;
    colorCodeAiBg: string;
    colorCodeAiBorder: string;
    colorCodeAiText: string;
    colorCodeAiCode: string;

    // ─── Chart Colors ──────────────────────────────────────────────
    colorChart1: string;
    colorChart2: string;
    colorChart3: string;
    colorChart4: string;
    colorChart5: string;
    colorChart6: string;
    colorChart7: string;
    colorChart8: string;
  }
}
