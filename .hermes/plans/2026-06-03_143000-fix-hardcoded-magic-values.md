1|# Fix Hardcoded Magic Values — Implementation Plan
2|
3|> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
4|
5|**Goal:** Eliminate all hardcoded magic values (colors, spacing, font sizes, border radius, etc.) from UI components and replace them with Ant Design theme tokens or shared constants.
6|
7|**Architecture:** Create a centralized design tokens constants file, then refactor each component file to use tokens instead of inline hardcoded values. Follow antd's token system: `theme.useToken()` gives access to all design tokens at runtime.
8|
9|**Tech Stack:** Ant Design v6, React 19, TypeScript, Next.js 16
10|
11|---
12|
13|## Reference: Ant Design v6 Token System
14|
15|### Available Standard Tokens (via `theme.useToken()`)
16|```
17|Colors:
18|  token.colorPrimary, token.colorPrimaryHover
19|  token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo
20|  token.colorText, token.colorTextSecondary, token.colorTextTertiary, token.colorTextQuaternary
21|  token.colorBgContainer, token.colorBgLayout, token.colorBgElevated
22|  token.colorBorder, token.colorBorderSecondary
23|
24|Typography:
25|  token.fontSize (14), token.fontSizeSM (12), token.fontSizeLG (16), token.fontSizeXL (20)
26|  token.fontSizeHeading1-5
27|  token.fontWeightStrong (700)
28|  token.lineHeight
29|
30|Spacing:
31|  token.paddingXXS (4), token.paddingXS (8), token.paddingSM (12), token.paddingMD (16), token.paddingLG (24), token.paddingXL (32)
32|  token.marginXXS (4), token.marginXS (8), token.marginSM (12), token.marginMD (16), token.marginLG (24), token.marginXL (32)
33|  token.marginXXL (48)
34|
35|Sizing:
36|  token.sizeXXS (12), token.sizeXS (16), token.sizeSM (24), token.sizeMD (32), token.sizeLG (40), token.sizeXL (48), token.sizeXXL (56)
37|
38|Border:
39|  token.borderRadius (8 in this project), token.borderRadiusSM (4), token.borderRadiusLG (12), token.borderRadiusXL (16)
40|
41|Shadows:
42|  token.boxShadow, token.boxShadowSecondary, token.boxShadowTertiary
43|
44|Transitions:
45|  token.motionDurationMid (0.2s)
46|```
47|
48|### Custom Tokens (defined in `src/config/antd-theme.ts`)
49|```
50|  token.colorPurple (#7c3aed), token.colorPurpleBg (#faf5ff)
51|  token.colorTealAccent (#14b8a6), token.colorTealBg (#f0fdf4), token.colorTealDeepBg (#f0fdfa)
52|  token.colorWarningDark (#92400e), token.colorWarningBg (#fffbeb)
53|  token.colorSidebarBg (#001529), token.colorSidebarBorder (#1d2635)
54|  token.colorCodeBg, token.colorCodeText, token.colorCodeHighlight, token.colorCodeAnnotation
55|```
56|
57|### What NEEDS a Shared Constant (not in antd tokens)
58|- Modal widths (420, 520, 600, 640)
59|- Layout sizes (header height, sidebar width, avatar sizes)
60|- Severity colors (critical bg, high bg, medium bg, low bg, info bg)
61|- Z-index layers
62|
63|---
64|
65|## Task 1: Create Design Constants File
66|
67|**Objective:** Create a shared constants file for values not covered by antd tokens, following existing `src/commons/constants/` pattern.
68|
69|**Files:**
70|- Create: `src/commons/constants/layout.ts`
71|
72|**Step 1: Create the constants file**
73|
74|```typescript
75|/**
76| * Layout & design constants for values not covered by antd theme tokens.
77| *
78| * For colors, use STATUS_TOKENS from '@/commons/tokens'.
79| * For auth page colors, use AUTH_THEME from '@/commons/constants/theme'.
80| * This file is ONLY for layout dimensions, modal widths, and z-index layers.
81| *
82| * @example
83| * ```tsx
84| * import { LAYOUT, MODAL_WIDTH } from '@/commons/constants/layout';
85| *
86| * <Modal width={MODAL_WIDTH.MD}>
87| * <Header style={{ height: LAYOUT.HEADER_HEIGHT }}>
88| * ```
89| */
90|
91|/* ── Modal & Drawer widths ─────────────────────────────────── */
92|export const MODAL_WIDTH = {
93|  SM: 420,
94|  MD: 520,
95|  LG: 600,
96|  XL: 640,
97|} as const;
98|
99|/* ── Layout dimensions ─────────────────────────────────────── */
100|export const LAYOUT = {
101|  HEADER_HEIGHT: 60,
102|  SIDEBAR_WIDTH: 260,
103|  SIDEBAR_COLLAPSED_WIDTH: 80,
104|  AVATAR_SM: 28,
105|  AVATAR_MD: 36,
106|  AVATAR_LG: 44,
107|  ICON_SM: 18,
108|  ICON_MD: 24,
109|  ICON_LG: 36,
110|} as const;
111|
112|/* ── Z-index layers ────────────────────────────────────────── */
113|export const Z_INDEX = {
114|  HEADER: 90,
115|  SIDEBAR: 100,
116|  DROPDOWN: 1050,
117|  MODAL: 1000,
118|  DRAWER: 1000,
119|  TOOLTIP: 1070,
120|} as const;
121|
122|/* ── Transition durations ──────────────────────────────────── */
123|export const TRANSITION = {
124|  FAST: '120ms ease',
125|  NORMAL: '200ms ease',
126|  SLOW: '300ms ease',
127|} as const;
128|```
129|
130|**Step 2: Export from index**
131|
132|Add to `src/commons/constants/index.ts`:
133|```typescript
134|export * from './layout';
135|```
136|
137|**Step 3: Verify import works**
138|
139|Run: `npx tsc --noEmit src/commons/constants/layout.ts`
140|Expected: No errors
141|
142|**Step 4: Commit**
143|
144|```bash
145|git add src/commons/constants/layout.ts src/commons/constants/index.ts
146|git commit -m "chore: add layout constants for non-token values"
147|```
148|
149|---
150|
151|## Task 2: Fix app-shell.tsx (highest offender, ~30 values)
152|
153|**Objective:** Replace all hardcoded values in the app shell with theme tokens and design constants.
154|
155|**Files:**
156|- Modify: `src/components/layout/app-shell.tsx`
157|
158|**Step 1: Add imports**
159|
160|```typescript
161|import { LAYOUT, Z_INDEX, TRANSITION } from '@/commons/constants/layout';
162|```
163|
164|**Step 2: Fix SidebarBrand function**
165|
166|Replace:
167|```typescript
168|<div style={{ padding: '16px 12px', ... }}>
169|  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
170|    <div style={{ width: 36, height: 36, borderRadius: 8, ... color: '#ffffff' ... }}>
171|    ...
172|    <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 800 ... }}>
173|    <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
174|```
175|
176|With:
177|```typescript
178|import { Flex, Typography, theme } from 'antd';
179|const { Text } = Typography;
180|
181|// SidebarBrand
182|<Flex vertical style={{ padding: `${token.paddingMD}px ${token.paddingSM}px`, borderBottom: `1px solid ${token.colorSidebarBorder}` }}>
183|  <Flex align="center" gap={token.marginSM}>
184|    <div style={{
185|      width: LAYOUT.ICON_LG,
186|      height: LAYOUT.ICON_LG,
187|      borderRadius: token.borderRadiusLG,
188|      background: `linear-gradient(135deg, ${token.colorTealAccent} 0%, ${token.colorPrimary} 100%)`,
189|      display: 'flex',
190|      alignItems: 'center',
191|      justifyContent: 'center',
192|      color: token.colorBgContainer,
193|      boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
194|      flexShrink: 0,
195|    }}>
196|      <FaIcon icon="fa-shield-halved" />
197|    </div>
198|    <div style={{ minWidth: 0, overflow: 'hidden' }}>
199|      <Text strong style={{ color: token.colorBgContainer, fontSize: token.fontSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
200|        SAST Workspace
201|      </Text>
202|      <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: token.fontSizeSM, marginTop: token.marginXXS }}>
203|        AI-assisted security review
204|      </Text>
205|    </div>
206|  </Flex>
207|</Flex>
208|```
209|
210|**Step 3: Fix Header section**
211|
212|Replace hardcoded header styles with tokens:
213|```typescript
214|<Header style={{
215|  height: LAYOUT.HEADER_HEIGHT,
216|  padding: `0 ${token.paddingMD}px`,
217|  background: 'rgba(255, 255, 255, 0.94)',
218|  backdropFilter: 'blur(8px)',
219|  borderBottom: `1px solid ${token.colorBorderSecondary}`,
220|  display: 'flex',
221|  alignItems: 'center',
222|  justifyContent: 'space-between',
223|  position: 'sticky',
224|  top: 0,
225|  zIndex: Z_INDEX.HEADER,
226|}}>
227|```
228|
229|**Step 4: Fix account button and dropdown**
230|
231|Replace:
232|```typescript
233|<Button style={{ borderRadius: 8, padding: '0 10px', height: 40, ... }}>
234|  <div style={{ fontSize: 11, fontWeight: 800 ... }}>
235|  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 ... }}>
236|  <div style={{ color: token.colorTextSecondary, fontSize: 11 ... }}>
237|```
238|
239|With:
240|```typescript
241|<Button style={{ borderRadius: token.borderRadiusLG, padding: `0 ${token.paddingXS}px`, height: LAYOUT.AVATAR_LG, ... }}>
242|  <Text style={{ fontSize: token.fontSizeXS, fontWeight: token.fontWeightStrong ... }}>
243|  <Text strong style={{ fontSize: token.fontSizeSM ... }}>
244|  <Text type="secondary" style={{ fontSize: token.fontSizeXS ... }}>
245|```
246|
247|**Step 5: Run lint**
248|
249|Run: `npm run lint -- --fix src/components/layout/app-shell.tsx`
250|Expected: No errors
251|
252|**Step 6: Commit**
253|
254|```bash
255|git add src/components/layout/app-shell.tsx
256|git commit -m "fix: replace hardcoded values in app-shell with theme tokens"
257|```
258|
259|---
260|
261|## Task 3: Fix FindingItem.tsx (~20 values)
262|
263|**Objective:** Replace hardcoded severity colors, spacing, and border radius with tokens.
264|
265|**Files:**
266|- Modify: `src/features/scan/FindingItem.tsx`
267|
268|**Step 1: Add imports**
269|
270|```typescript
271|import { TRANSITION } from '@/commons/constants/layout';
272|```
273|
274|**Step 2: Fix AiAnalysisCard error background**
275|
276|Replace:
277|```typescript
278|<div style={{ padding: token.paddingSM, background: '#fef2f2', borderRadius: token.borderRadiusLG }}>
279|```
280|
281|With:
282|```typescript
283|<div style={{ padding: token.paddingSM, background: STATUS_TOKENS.severity.critical.bg, borderRadius: token.borderRadiusLG }}>
284|```
285|
286|**Step 3: Fix severity color map**
287|
288|Replace hardcoded map:
289|```typescript
290|const SEVERITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
291|  critical: { bg: '#fef2f2', color: token.colorError, border: token.colorError },
292|  high: { bg: '#fef2f2', color: token.colorError, border: token.colorError },
293|  medium: { bg: '#eff6ff', color: token.colorInfo, border: token.colorInfo },
294|  low: { bg: '#f0fdf4', color: token.colorSuccess, border: token.colorSuccess },
295|  info: { bg: '#f8fafc', color: token.colorTextSecondary, border: token.colorBorder },
296|};
297|```
298|
299|With:
300|```typescript
301|const SEVERITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
302|  critical: { bg: STATUS_TOKENS.severity.critical.bg, color: token.colorError, border: token.colorError },
303|  high: { bg: STATUS_TOKENS.severity.high.bg, color: token.colorError, border: token.colorError },
304|  medium: { bg: STATUS_TOKENS.severity.medium.bg, color: token.colorInfo, border: token.colorInfo },
305|  low: { bg: STATUS_TOKENS.severity.low.bg, color: token.colorSuccess, border: token.colorSuccess },
306|  info: { bg: STATUS_TOKENS.severity.low.bg, color: token.colorTextSecondary, border: token.colorBorder },
307|};
308|```
309|
310|**Step 4: Fix tag borderRadius**
311|
312|Replace:
313|```typescript
314|<Tag style={{ borderRadius: 6, ... }}>
315|```
316|
317|With:
318|```typescript
319|<Tag style={{ borderRadius: token.borderRadius, ... }}>
320|```
321|
322|**Step 5: Fix vulnerability highlight**
323|
324|Replace:
325|```typescript
326|borderLeft: '3px solid #dc2626'
327|```
328|
329|With:
330|```typescript
331|borderLeft: `3px solid ${STATUS_TOKENS.severity.critical.color}`
332|```
333|
334|**Step 6: Fix transition**
335|
336|Replace:
337|```typescript
338|transition: 'border-color 120ms ease'
339|```
340|
341|With:
342|```typescript
343|transition: `border-color ${TRANSITION.FAST}`
344|```
345|
346|**Step 7: Commit**
347|
348|```bash
349|git add src/features/scan/FindingItem.tsx
350|git commit -m "fix: replace hardcoded values in FindingItem with tokens and constants"
351|```
352|
353|---
354|
355|## Task 4: Fix FindingsTable.tsx (~15 values)
356|
357|**Objective:** Replace hardcoded font sizes, colors, and spacing.
358|
359|**Files:**
360|- Modify: `src/features/findings/FindingsTable.tsx`
361|
362|**Step 1: Replace hardcoded fontSize values**
363|
364|Replace all `fontSize: 12` with `fontSize: token.fontSizeSM`
365|Replace all `fontSize: 14` with `fontSize: token.fontSize`
366|
367|**Step 2: Replace hardcoded fontWeight**
368|
369|Replace `fontWeight: 600` with `fontWeight: token.fontWeightStrong` (or use `<Text strong>`)
370|
371|**Step 3: Replace hardcoded gap/padding**
372|
373|Replace `gap: 4` with `gap: token.marginXXS`
374|Replace `padding: '4px 16px'` with `padding: `${token.paddingXXS}px ${token.paddingMD}px``
375|
376|**Step 4: Commit**
377|
378|```bash
379|git add src/features/findings/FindingsTable.tsx
380|git commit -m "fix: replace hardcoded values in FindingsTable with tokens"
381|```
382|
383|---
384|
385|## Task 5: Fix AiVerificationBadge.tsx (~12 values)
386|
387|**Objective:** Replace hardcoded colors, opacity, and spacing.
388|
389|**Files:**
390|- Modify: `src/features/scan/AiVerificationBadge.tsx`
391|
392|**Step 1: Replace all `color: '#fff'` with `color: token.colorBgContainer`**
393|
394|**Step 2: Replace hardcoded borderRadius: 6 with token.borderRadius**
395|
396|**Step 3: Replace opacity: 0.8 with a comment explaining the intent (keep as-is if intentional)**
397|
398|**Step 4: Replace hardcoded margin/padding with token values**
399|
400|**Step 5: Commit**
401|
402|```bash
403|git add src/features/scan/AiVerificationBadge.tsx
404|git commit -m "fix: replace hardcoded values in AiVerificationBadge with tokens"
405|```
406|
407|---
408|
409|## Task 6: Fix NewScanModal.tsx (~15 values)
410|
411|**Objective:** Replace hardcoded colors, sizes, and spacing.
412|
413|**Files:**
414|- Modify: `src/features/scan/NewScanModal.tsx`
415|
416|**Step 1: Add imports**
417|
418|```typescript
419|import { LAYOUT, TRANSITION } from '@/commons/constants/layout';
420|```
421|
422|**Step 2: Replace modal width**
423|
424|Replace `width={640}` with `width={MODAL_WIDTH.XL}`
425|
426|**Step 3: Replace scanner green color**
427|
428|Replace `color: '#16a34a'` with `color: token.colorSuccess`
429|
430|**Step 4: Replace warning border**
431|
432|Replace `border: '1px solid #f59e0b'` with `border: `1px solid ${token.colorWarning}``
433|
434|**Step 5: Replace icon sizes**
435|
436|Replace `width: 18, height: 18` with `width: LAYOUT.ICON_SM, height: LAYOUT.ICON_SM`
437|
438|**Step 6: Replace transitions**
439|
440|Replace `transition: 'all 120ms ease'` with `transition: `all ${TRANSITION.FAST}``
441|
442|**Step 7: Commit**
443|
444|```bash
445|git add src/features/scan/NewScanModal.tsx
446|git commit -m "fix: replace hardcoded values in NewScanModal with tokens"
447|```
448|
449|---
450|
451|## Task 7: Fix RepositoryDetailDrawer.tsx (~10 values)
452|
453|**Objective:** Replace hardcoded spacing and font sizes.
454|
455|**Files:**
456|- Modify: `src/features/repositories/RepositoryDetailDrawer.tsx`
457|
458|**Step 1: Replace fontSize: 16 with token.fontSizeLG**
459|
460|**Step 2: Replace fontSize: 13 with token.fontSize (14 is closest)**
461|
462|**Step 3: Replace marginBottom: 12 with token.marginSM**
463|
464|**Step 4: Replace marginRight: 6 with token.marginXS**
465|
466|**Step 5: Replace gap: 12 with token.marginSM**
467|
468|**Step 6: Commit**
469|
470|```bash
471|git add src/features/repositories/RepositoryDetailDrawer.tsx
472|git commit -m "fix: replace hardcoded values in RepositoryDetailDrawer with tokens"
473|```
474|
475|---
476|
477|## Task 8: Fix ChangeRoleModal.tsx and InviteMemberModal.tsx (~8 values each)
478|
479|**Objective:** Replace hardcoded colors, spacing, and border radius.
480|
481|**Files:**
482|- Modify: `src/features/members/ChangeRoleModal.tsx`
483|- Modify: `src/features/members/InviteMemberModal.tsx`
484|
485|**Step 1: Replace color: '#475569' with token.colorTextSecondary**
486|
487|**Step 2: Replace color: '#b91c1c' with token.colorError**
488|
489|**Step 3: Replace borderRadius: 8 with token.borderRadiusLG**
490|
491|**Step 4: Replace gap: 12 with token.marginSM**
492|
493|**Step 5: Replace gap: 4 with token.marginXXS**
494|
495|**Step 6: Replace padding: 12 with token.paddingSM**
496|
497|**Step 7: Commit**
498|
499|```bash
500|git add src/features/members/ChangeRoleModal.tsx src/features/members/InviteMemberModal.tsx
501|