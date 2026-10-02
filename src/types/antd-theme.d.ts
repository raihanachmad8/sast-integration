/**
 * Type augmentation for custom antd theme tokens.
 *
 * Extends antd's AliasToken (the source type for GlobalToken) so that all custom
 * tokens defined in src/config/antd-theme.ts are recognized by TypeScript.
 *
 * This eliminates TS2339 errors like:
 *   Property 'colorPurple' does not exist on type 'GlobalToken'
 *
 * and TS2353 errors like:
 *   Object literal may only specify known properties, and 'colorPurple'
 *   does not exist in type 'Partial<AliasToken>'
 */
import 'antd/es/theme/interface/alias';

declare module 'antd/es/theme/interface/alias' {
  interface AliasToken {
    // Purple palette
    colorPurple: string;
    colorPurpleBg: string;

    // Teal palette
    colorTealAccent: string;
    colorTealBg: string;
    colorTealDeepBg: string;

    // Warning palette
    colorWarningDark: string;
    colorWarningBg: string;

    // Sidebar palette
    colorSidebarBg: string;
    colorSidebarBorder: string;

    // Code / syntax-highlighting palette
    colorCodeBg: string;
    colorCodeText: string;
    colorCodeHighlight: string;
    colorCodeAnnotation: string;
    colorCodeAiBg: string;
    colorCodeAiBorder: string;
    colorCodeAiText: string;
    colorCodeAiCode: string;
  }
}
