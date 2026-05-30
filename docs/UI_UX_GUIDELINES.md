# UI/UX Guidelines

**Purpose**: This document defines the professional UI/UX standards for SAST Integration. The goal is to create an interface that feels **trustworthy, clear, efficient, and consistent** — critical for a security tool.

All UI work should follow these principles.

---

## Core Principles

### 1. Trust & Professionalism
- The interface must feel secure and reliable.
- Use consistent, calm visual language (avoid overly bright or playful elements).
- Clear feedback on all actions.

### 2. Clarity Over Cleverness
- Information hierarchy must be obvious.
- Labels, empty states, and error messages should be explicit.
- Never make the user guess.

### 3. Consistency
- Use Ant Design components the same way everywhere.
- Spacing, typography, and interaction patterns must be predictable.
- "One way to do things" is preferred over multiple variations.

### 4. Reduce Cognitive Load
- Hide advanced options by default.
- Use progressive disclosure.
- Limit the number of visible actions at once.

### 5. Accessibility & Resilience
- All interactive elements must be keyboard accessible.
- Proper loading, empty, and error states are mandatory.
- Design for real-world conditions (slow networks, errors, long lists).

---

## Design System Rules

### Spacing
- Use Ant Design's spacing tokens consistently (`8px`, `16px`, `24px`, `32px`, `48px`).
- Maintain consistent padding inside cards and modals.
- Vertical rhythm: Use multiples of 8px between sections.

### Typography
- Use Ant Design's typography system.
- Headings must follow a clear hierarchy (`h1` → `h2` → `h3`).
- Never use font size or weight to create visual noise.

### Color
- Primary actions use the Ant Design primary color.
- Use semantic colors for status (success, warning, error, info).
- Avoid custom colors unless they are part of a defined palette.

### Components
- Prefer Ant Design components over custom ones.
- When creating custom components, they must follow the same spacing, typography, and interaction patterns as Ant Design.

---

## Required UI States

Every data-fetching view **must** handle these states properly:

| State       | Component Recommendation      | When to Show                          |
|-------------|-------------------------------|---------------------------------------|
| Loading     | `LoadingState`                | While data is being fetched           |
| Empty       | `EmptyState`                  | No data available                     |
| Error       | `ErrorState`                  | API call failed                       |
| Success     | Normal content                | Data successfully loaded              |

**Never** leave the user staring at a blank screen or a lone `<Spin />`.

---

## Navigation & Information Architecture

- Primary navigation should be limited to 5–7 main items.
- Use clear grouping (as done in Settings section).
- "Coming soon" / "Plan" features should not pollute the main navigation. Use one of these approaches:
  - Hide them completely until ready
  - Show them as disabled with a clear tooltip
  - Put them in a separate "Roadmap" or "Future" section

---

## Form & Interaction Patterns

- Use Ant Design `Form` with proper validation feedback.
- Show loading state on submit buttons during async actions.
- Use `Popconfirm` for destructive actions.
- Provide clear success feedback (toast or inline success state).

---

## Empty States & Error Messages

- Empty states must explain **why** it's empty and **what the user can do next**.
- Error messages should be user-friendly, not technical (unless in developer tools).

Bad:
> "Failed to fetch data"

Good:
> "We couldn't load your findings. Please check your connection and try again."

---

## Security & Trust Signals

- Clearly communicate permissions and roles.
- Show verification status where relevant (e.g., email verification banner).
- Use language that reinforces security ("Verified", "Secure", "Audit log", etc.).

---

## Implementation Guidelines

- All new pages should use the shared state components (`LoadingState`, `EmptyState`, `ErrorState`).
- Global banners (like email verification) belong in `AuthenticatedShell`.
- Complex tables should use Ant Design `Table` with proper pagination, filtering, and loading states.
- Avoid deeply nested conditionals in JSX — extract into small, well-named components.

---

## Current Gaps (as of May 2026)

- Inconsistent use of empty/loading states across pages.
- Too many "Plan" badges in navigation.
- Limited global feedback system (toasts, banners).
- Email verification experience is not yet polished.

These should be prioritized in upcoming milestones.

---

**Last Updated**: May 2026

This document should be treated as a living standard. Any significant UI change should be reviewed against these guidelines.