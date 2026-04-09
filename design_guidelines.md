# Mop Mafia CRM - Design Guidelines

## Design Approach
**System-Based Approach:** Drawing from Linear and Notion's modern CRM aesthetics with Fluent Design's productivity focus. This is an internal operations tool prioritizing clarity, efficiency, and information density.

## Core Design Principles
- **Data-First Layout:** Information hierarchy optimized for scanning large datasets
- **Operational Efficiency:** Quick access to critical actions and status indicators
- **Professional Utility:** Clean, professional aesthetic appropriate for family business operations

## Typography System
- **Primary Font:** Inter (Google Fonts) - exceptional legibility for data tables
- **Headings:** 
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Card/widget titles: text-base font-medium
- **Body Text:** text-sm for tables and lists, text-base for forms
- **Data Values:** font-mono for phone numbers, IDs, timestamps

## Layout & Spacing
**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Page margins: px-6 py-8

**Dashboard Grid Structure:**
- Sidebar navigation: 240px fixed width
- Main content: flex-1 with max-w-7xl container
- Dashboard widgets: 2-3 column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

**Navigation**
- Fixed left sidebar with company logo, primary nav items (Leads, Customers, Calls, Messages, Jobs), user profile at bottom
- Top bar: page breadcrumbs, search, quick-add actions, notifications

**Data Tables** (Primary UI Pattern)
- Sortable column headers with sort indicators
- Row hover states for clarity
- Inline actions (view, edit, call) on hover
- Status badges with distinct visual treatment
- Pagination controls below table
- Bulk selection checkboxes when applicable

**Lead/Customer Cards**
- Compact card design showing: name, phone (clickable to call), status badge, last contact timestamp, quick actions
- Grid view for browsing, list view for detailed scanning

**Call Log Panel**
- Chronological timeline layout
- Direction indicators (inbound/outbound icons)
- Duration, status, and timestamp for each call
- Expandable details for call events

**Message Thread View**
- Chat-style interface with sender/recipient differentiation
- Message bubbles with timestamps
- Status indicators (sent, delivered, read)
- Quick reply input at bottom

**Forms**
- Single-column layout with clear field labels above inputs
- Grouped related fields with visual separation
- Primary action buttons (Save, Create) right-aligned
- Secondary actions (Cancel) adjacent but visually subordinate

**Status System**
- Lead Status: New (blue), Contacted (purple), Booked (yellow), Active (green), Completed (gray), Lost (red)
- Call Status: Badges with appropriate semantic colors
- Job Status: Visual timeline/progress indicators

**Dashboard Widgets**
- Stat cards: Large number display with label and trend indicator
- Recent activity feed: chronological list with type icons
- Quick actions panel: large touch-friendly buttons for common tasks (Add Lead, Log Call, Schedule Job)

**Job Calendar**
- Weekly/monthly grid view
- Job cards showing customer, service type, time window
- Drag-and-drop for rescheduling (visual affordance)

## Images
No hero images required. This is an internal operations tool.

**Practical Images:**
- Company logo in sidebar (square, 48x48px)
- Empty state illustrations for zero-data scenarios (e.g., "No leads yet" with simple line art)
- Customer profile placeholders (circular avatars, 40x40px)

## Accessibility & UX
- High-contrast text for readability during long work sessions
- Keyboard shortcuts for power users (displayed in tooltips)
- Clear focus states on all interactive elements
- Loading states for data fetches
- Error states with actionable messages
- Optimistic UI updates for responsive feel

## Mobile Responsiveness
- Stack sidebar into top hamburger menu on mobile
- Single-column layouts for all grids
- Simplified tables with most critical columns visible
- Touch-friendly tap targets (min 44x44px)