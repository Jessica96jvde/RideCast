# 🌐 RideCast Frontend Web Application

This is the Next.js React frontend for the RideCast platform, delivering an intuitive interface for commuters and transit authority officers.

---

## 🗂️ Component & Directory Structure

```
frontend/
├── public/                       # Static public assets & icons
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── globals.css           # Tailwind CSS 4 theme & custom utilities
│   │   ├── layout.tsx            # Global HTML shell & font definitions
│   │   └── page.tsx              # Main application view with tab switching
│   ├── components/               # Modular UI Components
│   │   ├── auth/                 # Authority Officer Authentication
│   │   │   └── LoginModal.tsx    # Secure modal for login with JWT-like tokens
│   │   ├── authority/            # Transport Authority Operations
│   │   │   ├── AllocationAuditLog.tsx      # Dispatch audit history
│   │   │   ├── AuthorityForecastView.tsx   # Corridor load forecasts & trends
│   │   │   ├── AuthorityIdleBusesView.tsx  # Depot bus inventory status
│   │   │   ├── AuthorityPortal.tsx         # Authority dashboard container
│   │   │   ├── AuthorityProfileView.tsx    # Officer profile & settings
│   │   │   ├── ExecutiveKPIs.tsx           # High-level metrics (passengers, buses, load)
│   │   │   ├── FleetStatusTable.tsx        # Active vs Idle bus roster
│   │   │   ├── PDFExportButton.tsx         # 1-click official PDF report download
│   │   │   ├── RouteIntelligenceGrid.tsx   # Per-route risk cards
│   │   │   └── SmartAllocationModal.tsx    # Proximity bus dispatch modal
│   │   ├── layout/               # Application Shell
│   │   │   ├── Navbar.tsx        # Top navigation & authority quick-login
│   │   │   └── Sidebar.tsx       # Navigation tabs & system status
│   │   ├── map/                  # Geospatial Visualization
│   │   │   ├── LeafletJourneyMap.tsx       # Commuter origin-destination route map
│   │   │   └── LeafletNetworkMap.tsx       # Network-wide corridor map
│   │   └── passenger/            # Commuter Portal
│   │       ├── FeedbackWidget.tsx          # Commuter forecast rating widget
│   │       ├── ForecastCard.tsx            # Time-slot crowd card with badges
│   │       ├── JourneySearch.tsx           # Stop & date picker search bar
│   │       ├── PassengerPortal.tsx         # Commuter view container
│   │       └── SystemCalendar.tsx          # Travel date picker with holiday tags
│   └── lib/                      # Utilities & API Client
│       ├── api.ts                # Type-safe API client for FastAPI backend
│       ├── types.ts              # TypeScript interfaces for API models
│       └── utils.ts              # Styling & format helper functions
├── package.json
└── tsconfig.json
```

---

## 🚀 Running the Frontend Development Server

```bash
# Navigate to the frontend directory
cd frontend

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Theme & Styling

* **Framework:** Tailwind CSS 4 with custom transit palette.
* **Palette:**
  * Background: `#1F2329` (Sleek Dark Slate)
  * Accent / Bus Red: `#AF4B47`
  * Highlight / Cream: `#EDDECB`
  * Status Colors: Green (Low Crowd), Amber (Moderate), Rose (High Crowd)
