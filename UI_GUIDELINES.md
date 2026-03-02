# UI Guidelines (Workforce + Supervisor Friendly)

This guideline is for users with low technical familiarity, especially production workforce and supervisors.
Design decisions prioritize readability, clarity, and low cognitive load.

## 1) Core Principles

- Keep screens simple: one primary action per section.
- Use clear labels, not technical wording.
- Prefer larger text and high contrast.
- Use consistent color meaning across all modules.
- Show immediate success/error feedback after user actions.

## 2) Typography Standards

### Font Family

- Primary: Inter
- Fallback: Segoe UI, Roboto, Arial, sans-serif

### Font Weights

- Page titles: 700
- Section titles: 600
- Field labels and button text: 600
- Body text: 400 to 500

### Font Sizes

- Page title: 28px to 32px
- Section heading: 22px to 24px
- Card/Widget title: 18px to 20px
- Body text: 16px
- Form labels: 16px
- Helper text: 14px
- Minimum text size anywhere: 14px

### Line Height

- Body and forms: 1.5
- Headings: 1.3 to 1.4

## 3) Color Palette (Name + Hex)

### Neutrals and Text

- Midnight Ink (Primary Text): #111827
- Slate Text (Secondary Text): #374151
- Cool Gray (Muted/Helper Text): #6B7280
- White (Card Background / Text on Dark): #FFFFFF
- Cloud Gray (Page Background): #F9FAFB
- Soft Border Gray (Borders/Dividers): #E5E7EB

### Brand and Actions

- Trust Blue (Primary Action): #2563EB
- Deep Blue (Primary Hover): #1D4ED8
- Sky Blue (Info Highlight): #0EA5E9

### Status Colors

- Success Green (Success/Approved): #16A34A
- Dark Success Green (Success Text): #166534
- Warning Amber (Pending/Attention): #D97706
- Soft Warning Amber (Warning Background): #FEF3C7
- Alert Red (Error/Delete): #DC2626
- Dark Alert Red (Error Text): #B91C1C
- Soft Error Red (Error Background): #FEE2E2

## 4) Color Usage Rules

- Primary button: Trust Blue background, White text.
- Danger action: Alert Red background, White text.
- Success status chip: Success Green text on very light green background.
- Warning status chip: Warning Amber text on Soft Warning Amber background.
- Error alerts: Dark Alert Red text on Soft Error Red background.
- Do not use color as the only signal; add text labels/icons.

## 5) Layout and Spacing

- Use one-column forms for data entry screens.
- Group related fields in clearly titled sections.
- Keep consistent spacing scale (8px base): 8, 12, 16, 24, 32.
- Minimum button/input height: 44px.
- Keep important actions visible without scrolling when possible.

## 6) Form and Interaction Guidelines

- Always show field labels above inputs.
- Mark required fields clearly with simple wording.
- Show validation messages next to the field.
- Use plain-language error text (example: "Phone number is required").
- Primary action button label should be specific ("Save Product", not "Submit").

## 7) Accessibility Requirements

- Maintain WCAG AA contrast (at least 4.5:1 for normal text).
- Keyboard navigable forms and actions.
- Visible focus state for all interactive controls.
- Never use text below 14px.
- Avoid dense tables on small screens; use card/list fallback where possible.

## 8) Recommended UI Patterns for This Product

- Dashboard cards with clear counts and one action each.
- Step-based forms for long workflows.
- Status badges for workflow states (Pending/Approved/Rejected).
- Confirmation prompts only for destructive actions.
- Toast/snackbar for quick success feedback.

## 9) Do / Don’t

### Do

- Use simple labels and operational language.
- Keep module UIs visually consistent.
- Use clear primary and secondary buttons.
- Test screens with real production data examples.

### Don’t

- Don’t use low-contrast gray-on-gray text.
- Don’t use more than one primary action per section.
- Don’t hide important actions inside deep menus.
- Don’t rely only on color to explain meaning.

## 10) Quick Reference Token Mapping

- text-primary: #111827
- text-secondary: #374151
- text-muted: #6B7280
- bg-page: #F9FAFB
- bg-card: #FFFFFF
- border-default: #E5E7EB
- action-primary: #2563EB
- action-primary-hover: #1D4ED8
- state-success: #16A34A
- state-warning: #D97706
- state-danger: #DC2626

---

Use this as the single source of truth for all frontend pages to maintain a clean and easy-to-use experience for non-technical users.
