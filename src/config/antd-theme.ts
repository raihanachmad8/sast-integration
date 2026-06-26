import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

/**
 * Ant Design Theme Configuration — Single source of truth for all design tokens.
 *
 * All colors, fonts, spacing, and layout values used across the app
 * should be defined here. Access via theme.useToken() in components.
 *
 * @see docs/PROJECT_STANDARDS.md#design-tokens
 */
export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // ─── Brand Colors ──────────────────────────────────────────────
    colorPrimary: '#0f766e',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#14b8a6',

    // ─── Primary Palette ───────────────────────────────────────────
    colorPrimaryBg: '#f0fdfa',
    colorPrimaryBgHover: '#ccfbf1',
    colorPrimaryBorder: '#5eead4',
    colorPrimaryBorderHover: '#2dd4bf',
    colorPrimaryHover: '#14b8a6',
    colorPrimaryActive: '#0d9488',
    colorPrimaryText: '#0d9488',
    colorPrimaryTextHover: '#0f766e',
    colorPrimaryTextActive: '#115e59',

    // ─── Success Palette ───────────────────────────────────────────
    colorSuccessBg: '#f0fdf4',
    colorSuccessBgHover: '#dcfce7',
    colorSuccessBorder: '#86efac',
    colorSuccessBorderHover: '#4ade80',
    colorSuccessHover: '#22c55e',
    colorSuccessActive: '#16a34a',
    colorSuccessText: '#16a34a',
    colorSuccessTextHover: '#22c55e',
    colorSuccessTextActive: '#15803d',

    // ─── Warning Palette ───────────────────────────────────────────
    colorWarningBg: '#fffbeb',
    colorWarningBgHover: '#fef3c7',
    colorWarningBorder: '#fcd34d',
    colorWarningBorderHover: '#fbbf24',
    colorWarningHover: '#f59e0b',
    colorWarningActive: '#d97706',
    colorWarningText: '#d97706',
    colorWarningTextHover: '#f59e0b',
    colorWarningTextActive: '#b45309',

    // ─── Error Palette ─────────────────────────────────────────────
    colorErrorBg: '#fef2f2',
    colorErrorBgHover: '#fee2e2',
    colorErrorBorder: '#fca5a5',
    colorErrorBorderHover: '#f87171',
    colorErrorHover: '#ef4444',
    colorErrorActive: '#dc2626',
    colorErrorText: '#dc2626',
    colorErrorTextHover: '#ef4444',
    colorErrorTextActive: '#b91c1c',

    // ─── Info Palette ──────────────────────────────────────────────
    colorInfoBg: '#f0fdfa',
    colorInfoBgHover: '#ccfbf1',
    colorInfoBorder: '#5eead4',
    colorInfoBorderHover: '#2dd4bf',
    colorInfoHover: '#14b8a6',
    colorInfoActive: '#0d9488',
    colorInfoText: '#0d9488',
    colorInfoTextHover: '#14b8a6',
    colorInfoTextActive: '#115e59',

    // ─── Background ────────────────────────────────────────────────
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgSpotlight: '#00000026',
    colorBgMask: '#00000045',

    // ─── Text ──────────────────────────────────────────────────────
    colorText: '#000000d9',
    colorTextSecondary: '#00000073',
    colorTextTertiary: '#00000040',
    colorTextQuaternary: '#00000025',
    colorTextBase: '#000000',
    colorTextLightSolid: '#ffffff',

    // ─── Border ────────────────────────────────────────────────────
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    // ─── Fill ──────────────────────────────────────────────────────
    colorFill: '#00000015',
    colorFillSecondary: '#0000000a',
    colorFillTertiary: '#00000006',
    colorFillQuaternary: '#00000003',

    // ─── Typography ────────────────────────────────────────────────
    fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontWeightStrong: 600,
    lineHeight: 1.5714,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6667,
    lineHeightHeading1: 1.2105,
    lineHeightHeading2: 1.2667,
    lineHeightHeading3: 1.3333,

    // ─── Spacing (Margin) ──────────────────────────────────────────
    margin: 16,
    marginXXS: 4,
    marginXS: 8,
    marginSM: 12,
    marginLG: 24,
    marginXL: 32,
    marginXXL: 48,

    // ─── Spacing (Padding) ─────────────────────────────────────────
    padding: 16,
    paddingXXS: 4,
    paddingXS: 8,
    paddingSM: 12,
    paddingLG: 24,
    paddingXL: 32,

    // ─── Size ──────────────────────────────────────────────────────
    sizeXXL: 48,
    sizeXL: 32,
    sizeLG: 24,
    size: 16,
    sizeMS: 12,
    sizeSM: 8,
    sizeXS: 6,

    // ─── Border Radius ─────────────────────────────────────────────
    borderRadius: 8,
    borderRadiusXS: 4,
    borderRadiusSM: 6,
    borderRadiusLG: 12,
    borderRadiusOuter: 4,

    // ─── Control ───────────────────────────────────────────────────
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
    controlHeightXS: 16,

    // ─── Motion ────────────────────────────────────────────────────
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',

    // ─── Z-Index ───────────────────────────────────────────────────

    // ─── Box Shadow ────────────────────────────────────────────────
    boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',

    // ─── Purple Palette (Custom) ───────────────────────────────────
    colorPurple: '#722ed1',
    colorPurpleBg: '#f9f0ff',
    colorPurpleBorder: '#d3adf7',
    colorPurpleHover: '#9254de',
    colorPurpleActive: '#531dab',
    colorPurpleText: '#531dab',
    colorPurpleTextHover: '#722ed1',

    // ─── Teal Palette (Custom) ─────────────────────────────────────
    colorTealAccent: '#0f766e',
    colorTealBg: '#f0fdfa',
    colorTealDeepBg: '#ccfbf1',
    colorTealBorder: '#5eead4',
    colorTealHover: '#14b8a6',
    colorTealActive: '#0d9488',
    colorTealText: '#0d9488',

    // ─── Sidebar (Custom) ──────────────────────────────────────────
    colorSidebarBg: '#ffffff',
    colorSidebarBorder: '#f0f0f0',
    colorSidebarItemActive: '#f0fdfa',
    colorSidebarItemHover: '#f5f5f5',

    // ─── Sidebar Dark (app-shell) ──────────────────────────────────
    colorSidebarBgDark: '#0f172a',
    colorSidebarBorderDark: '#2b3440',
    colorSidebarTextDark: '#c8d1dc',
    colorSidebarTextSecondaryDark: '#8f9bad',

    // ─── Code / Syntax Highlighting (Custom) ───────────────────────
    colorCodeBg: '#1e1e1e',
    colorCodeText: '#d4d4d4',
    colorCodeHighlight: '#ef4444',
    colorCodeAnnotation: '#6a9955',
    colorCodeString: '#ce9178',
    colorCodeKeyword: '#569cd6',
    colorCodeFunction: '#dcdcaa',
    colorCodeVariable: '#9cdcfe',
    colorCodeAiBg: '#1a1a2e',
    colorCodeAiBorder: '#722ed1',
    colorCodeAiText: '#e2e8f0',
    colorCodeAiCode: '#a5f3fc',

    // ─── Chart Colors (Custom) ─────────────────────────────────────
    colorChart1: '#0f766e',
    colorChart2: '#10b981',
    colorChart3: '#f59e0b',
    colorChart4: '#ef4444',
    colorChart5: '#722ed1',
    colorChart6: '#0f766e',
    colorChart7: '#ec4899',
    colorChart8: '#6366f1',
  },
  components: {
    // ─── Layout ────────────────────────────────────────────────────
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 60,
      headerPadding: '0 24px',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
      triggerBg: '#f5f5f5',
      triggerColor: '#00000073',
    },

    // ─── Menu ──────────────────────────────────────────────────────
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#f0fdfa',
      itemSelectedColor: '#0f766e',
      itemHoverBg: '#f5f5f5',
      itemColor: '#000000d9',
      itemActiveBg: '#f0fdfa',
      subMenuItemBg: 'transparent',
      itemMarginInline: 8,
      itemPaddingInline: 12,
      iconSize: 16,
      collapsedIconSize: 16,
    },

    // ─── Button ────────────────────────────────────────────────────
    Button: {
      contentFontSize: 14,
      contentFontSizeLG: 16,
      contentFontSizeSM: 12,
      onlyIconSize: 14,
      onlyIconSizeLG: 16,
      onlyIconSizeSM: 12,
      borderRadius: 8,
      borderRadiusSM: 6,
      borderRadiusLG: 10,
    },

    // ─── Input ─────────────────────────────────────────────────────
    Input: {
      borderRadius: 8,
      borderRadiusSM: 6,
      borderRadiusLG: 10,
    },

    // ─── InputNumber ───────────────────────────────────────────────
    InputNumber: {},

    // ─── Select ────────────────────────────────────────────────────
    Select: {},

    // ─── Table ─────────────────────────────────────────────────────
    Table: {
      headerBg: '#fafafa',
      headerColor: '#000000d9',
      headerSortActiveBg: '#f0f0f0',
      headerSortHoverBg: '#f0f0f0',
      rowHoverBg: '#fafafa',
      rowSelectedBg: '#e6f4ff',
      rowSelectedHoverBg: '#bae0ff',
      colorBgContainer: '#ffffff',
      borderColor: '#f0f0f0',
      borderRadius: 8,
    },

    // ─── Card ──────────────────────────────────────────────────────
    Card: {
      paddingLG: 24,
      paddingSM: 16,
      borderRadiusLG: 12,
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e5e7eb',
    },

    // ─── Modal ─────────────────────────────────────────────────────
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      titleColor: '#000000d9',
      titleFontSize: 18,
      borderRadiusLG: 12,
      paddingLG: 24,
    },

    // ─── Drawer ────────────────────────────────────────────────────
    Drawer: {
      colorBgElevated: '#ffffff',
      borderRadiusLG: 0,
      paddingLG: 24,
    },

    // ─── Tag ───────────────────────────────────────────────────────
    Tag: {
      borderRadius: 6,
      fontSizeSM: 12,
    },

    // ─── Badge ─────────────────────────────────────────────────────
    Badge: {
      dotSize: 8,
      textFontSize: 12,
      textFontWeight: 600,
    },

    // ─── Alert ─────────────────────────────────────────────────────
    Alert: {
      borderRadius: 8,
    },

    // ─── Tabs ──────────────────────────────────────────────────────
    Tabs: {
      cardHeight: 36,
      cardPadding: '6px 16px',
      horizontalItemGutter: 32,
      horizontalMargin: '0 0 16px 0',
      inkBarColor: '#0f766e',
      itemSelectedColor: '#0f766e',
      itemColor: '#00000073',
      itemHoverColor: '#0f766e',
    },

    // ─── Form ──────────────────────────────────────────────────────
    Form: {
      labelColor: '#000000d9',
      labelFontSize: 14,
      labelHeight: 32,
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 8px 0',
    },

    // ─── Pagination ────────────────────────────────────────────────
    Pagination: {
      itemSize: 32,
      itemSizeSM: 24,
      borderRadius: 8,
    },

    // ─── Dropdown ──────────────────────────────────────────────────
    Dropdown: {
      borderRadiusLG: 8,
    },

    // ─── Popover ───────────────────────────────────────────────────
    Popover: {
      borderRadiusLG: 12,
      paddingLG: 16,
    },

    // ─── Tooltip ───────────────────────────────────────────────────
    Tooltip: {
      borderRadius: 6,
    },

    // ─── Result ────────────────────────────────────────────────────
    Result: {
      borderRadiusLG: 12,
    },

    // ─── Typography ────────────────────────────────────────────────
    Typography: {
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorInfo: '#14b8a6',
      fontSizeHeading1: 38,
      fontSizeHeading2: 30,
      fontSizeHeading3: 24,
      fontSizeHeading4: 20,
      fontSizeHeading5: 16,
    },

    // ─── Spin ──────────────────────────────────────────────────────
    Spin: {
      colorPrimary: '#0f766e',
    },

    // ─── Skeleton ──────────────────────────────────────────────────
    Skeleton: {
      borderRadius: 8,
      colorFillContent: '#f0f0f0',
      colorFill: '#e8e8e8',
    },

    // ─── Message ───────────────────────────────────────────────────
    Message: {
      borderRadiusLG: 8,
    },

    // ─── Notification ──────────────────────────────────────────────
    Notification: {
      borderRadiusLG: 12,
    },
  },
};
