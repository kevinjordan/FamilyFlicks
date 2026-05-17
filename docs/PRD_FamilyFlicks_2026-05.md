# PRD: FamilyFlicks

| Field | Value |
|---|---|
| **Project Name** | FamilyFlicks |
| **Owner** | Kevin Jordan |
| **Runtime** | Progressive Web App (PWA) — Safari on iPhone, shareable via link |
| **Schedule** | On-demand (user-initiated sessions) |
| **Delivery Method** | In-app UI + Google Sheets persistence |
| **Status** | Live — deployed to Vercel |

---

## 1. Problem Statement

Families struggle to find movies that are genuinely appropriate for everyone in the room — accounting for each person's individual cert limits, past watches, and the household's language and content preferences. Scrolling streaming apps and IMDb lists wastes time and often surfaces movies already seen or clearly unsuitable. Without a record of what's been suggested and how the family responded, the same bad suggestions resurface repeatedly.

Adults in the household also want a way to find movies for themselves — separate from the family/children's suggestions — tracked in the same place.

---

## 2. Target Users

| User | Who they are and why they care |
|---|---|
| **Primary — Parent / Adult viewer** | Sets up the app, runs suggestion sessions (family or adults), rates movies. Needs quick, trustworthy picks without research overhead. |
| **Secondary — Household members** | Share the same app link and GDoc. Each person (child or adult) has their own cert limit configured in the app. |

---

## 3. Key Entities / Subjects

| Entity | Notes |
|---|---|
| **Person profile** | Stored as Person 1, Person 2, etc. Holds max allowed Irish cert and nudge permission. maxCert = '18' designates an adult viewer. No PII. |
| **Family settings** | Language preference, subtitles on/off, animation included/off, sibling rating default (youngest vs. eldest for children), streaming services subscribed. |
| **Movie record** | TMDB movie ID, title, genre(s), Irish cert, release year, language. |
| **Suggestion record** | Movie ID + session date + user response (Watched / Not Watched / Interested / Not Interested / Inappropriate). |
| **Rating record** | Movie ID + user score (1–10 slider) + date rated. Applied after a movie is marked Watched or Interested. |
| **Google Sheet** | User-owned. Stores all suggestion and rating records. Accessed via OAuth. Two sheets: `suggestions` and `settings`. |

---

## 4. Irish Cert System

| Cert | Audience |
|---|---|
| G | General — suitable for all ages |
| PG | Parental Guidance |
| 12A | 12 or accompanied by adult |
| 15A | 15 or accompanied by adult |
| 16 | 16 and over |
| 18 | 18 and over (Adult viewer) |

A person with maxCert = '18' is treated as an **adult viewer** throughout the app. All others (G through 16) are **children** for the purposes of cert ceiling logic.

---

## 5. Signal Types and Urgency Tiers

| Signal | Urgency | Logic |
|---|---|---|
| **User opens app / taps "Get Suggestions"** | Immediate | App reads GDoc history, fetches TMDB candidates, applies rules-based engine, returns 10 movies. |
| **User responds to a movie card** | Immediate | Response written to GDoc before user moves to next card. No batching. |
| **User taps "Go Again"** | Immediate | Re-runs suggestion pipeline excluding all previously responded movies. |
| **User rates a Watched/Interested movie** | On interaction | Rating written to GDoc when slider is confirmed. |
| **Settings changed** | Next session | New settings apply to the next suggestion run, not the current session. |

---

## 6. Feature List

### Implemented (current state)

**Setup & Onboarding**
- Onboarding wizard: number of people (1–6), cert per person, nudge toggle per non-adult person
- Sibling default (youngest/eldest) — shown when 2+ non-adult people
- Language / subtitles / animation preferences
- Decade range picker
- Streaming services selection (grid of icons, pre-sorted by Irish popularity)
- All settings editable post-onboarding via Settings screen

**Suggestions**
- Mode toggle on idle screen: **👪 Family** (green, cert-limited) vs **🍿 Adults** (blue, cert 18)
- 10 movie cards per session: poster, title, year, cert badge, genre tags, streaming icons
- 5 response buttons per card: ✅ Watched | 👀 Want | ⏭ Skip | 👎 Nope | 🚫 Flag
- Responses editable — tap any button to change
- Responses written to GDoc immediately (fire-and-forget)
- "Go Again" after 5 responses — excludes current session movies
- 3-pass TMDB fallback strategy: vote_average (10 pages) → popularity (5 pages) → relaxed vote_count (5 pages), capped at 80 candidates

**My List**
- Audience toggle: **👪 Family** vs **🍿 Adults** (family = G/PG/12A/15A certs; adults = 16/18 certs)
- Filter tabs: 👀 To Watch | ✅ Watched | ⏭️ Skipped
- Response buttons on each card — editable without navigating away
- Rating slider (1–10) for Watched / Interested items; Cancel available before first commit
- Item stays in current tab on response change; moves on tab switch
- Posters fetched at w185 size with lazy loading

**Search**
- Dedicated Search tab — debounced TMDB search (500ms)
- Search results as full MovieCard with response buttons
- Responses written to GDoc same as suggestion sessions

**Settings**
- Household section: add/remove any person (not just last), cert picker for all 6 Irish certs
- Nudge toggle hidden for adults (cert 18)
- Build date stamp shown in header
- Google Account section: connected / session expired / not connected states

**Auth & Persistence**
- Google OAuth 2.0 PKCE flow (no backend)
- `drive.file` scope — app only accesses files it created
- Auto token refresh; `authNeedsReconnect` banner when refresh fails
- Drive search for existing FamilyFlicks_Data file (orderBy=createdTime, 403-safe)
- GDoc deduplication: Map-based dedup by tmdb_id on read (last row wins)

### Planned / Enhanced
- Child-level session selector ("who's watching tonight?")
- Genre filter chips on the suggestion screen
- Swipe gestures on movie cards
- Push to suggest a re-watch of a highly rated movie

### Advanced / Future
- Shareable session link — siblings join the same session in real time
- Machine learning nudge
- Parental PIN lock on settings
- Export ratings as a formatted PDF

---

## 7. Data Model

### familyProfile (localStorage + GDoc settings sheet)

```json
{
  "siblingDefault": "youngest",
  "language": "en",
  "subtitles": false,
  "includeAnimation": true,
  "decadeFrom": 1990,
  "streamingServices": ["netflix", "disney_plus"],
  "people": [
    { "id": "person_1", "maxCert": "PG",  "nudgeEnabled": true  },
    { "id": "person_2", "maxCert": "15A", "nudgeEnabled": false },
    { "id": "person_3", "maxCert": "18",  "nudgeEnabled": false }
  ]
}
```

> **Migration:** profiles with `children` (legacy field) are automatically migrated to `people` on load.

### Google Sheets — suggestions sheet

| Column | Field | Notes |
|---|---|---|
| A | `tmdb_id` | |
| B | `title` | |
| C | `cert` | Irish cert |
| D | `genre` | pipe-separated |
| E | `release_year` | |
| F | `response` | Watched / Not Watched / Interested / Not Interested / Inappropriate |
| G | `rating` | 1–10, blank until rated |
| H | `session_date` | ISO 8601 |

**My List audience split** is derived from `cert` at read time: certs 16 and 18 → Adults tab; G/PG/12A/15A → Family tab.

---

## 8. Cert Ceiling Logic

### Children (Family) mode
1. From `familyProfile.people`, filter out adults (maxCert === '18').
2. Apply `siblingDefault`: youngest → minimum cert across remaining; eldest → maximum cert.
3. If nudge enabled on any non-adult person: up to 2 picks may be one cert above the ceiling.

### Adults mode
- Cert ceiling = '18'. No nudge. No cert filtering beyond standard TMDB query.

---

## 9. Technical Stack

| Concern | Decision |
|---|---|
| **Runtime** | Progressive Web App — React 19 + Vite 8, deployed to Vercel |
| **Mobile target** | iOS Safari (PWA installable via "Add to Home Screen") |
| **Routing** | HashRouter (required for Vercel PWA without server-side routing) |
| **Movie data** | TMDB API (free tier, REST) |
| **Suggestion engine** | Rules-based JS scoring in `src/services/suggestionEngine.js` (replaced Claude API) |
| **Authentication** | Google OAuth 2.0 PKCE — no backend required |
| **Persistence** | Google Sheets API v4 — two sheets: `suggestions` and `settings` |
| **Local state** | `localStorage` for settings cache; React context (`AppContext`) for session state |
| **Styling** | Tailwind CSS v4 |
| **Toasts** | `react-hot-toast` |
| **PWA** | `vite-plugin-pwa` with Workbox |
| **Build date** | Injected at build time via Vite `define` → `__BUILD_DATE__` |
| **Hosting** | Vercel (free tier) |

---

## 10. Architecture — Key Files

```
src/
  App.jsx                          # Root: ErrorBoundary → AppProvider → HashRouter → OAuthGate
  context/AppContext.jsx           # Global state: familyProfile, googleAuth, spreadsheetId
  hooks/useGdocService.js          # Binds gdocService functions to context token/spreadsheetId
  services/
    authService.js                 # PKCE OAuth, token refresh
    gdocService.js                 # Google Sheets API: findOrCreateSheet, read/write functions
    tmdbService.js                 # TMDB: fetchCandidates (3-pass), fetchPosterPaths, searchMovies
    suggestionEngine.js            # Rules-based selection: cert ceiling, nudge, genre variety, scoring
  constants/
    certs.js                       # CERTS=['G','PG','12A','15A','16','18'], CERT_RANK, resolveCertCeiling
    streamingServices.js           # Service list with tmdbId, label, abbr, color
  components/
    Shell.jsx                      # Bottom tab nav (4 tabs), auth/offline banners
    MovieCard.jsx                  # RESPONSES, RESPONSE_BG exports; full card component
    CertBadge.jsx                  # Coloured cert label
    Toggle.jsx                     # On/off switch
    onboarding/
      StepChildCount.jsx           # "How many people?" picker
      StepChildDetail.jsx          # Per-person cert + age stepper (age 0–99, cert G–18)
      StepSiblingDefault.jsx       # Youngest/eldest choice
      StepPreferences.jsx          # Language, subtitles, animation
      StepDecade.jsx               # Decade range
      StepStreaming.jsx             # Streaming service selector
  screens/
    OnboardingScreen.jsx           # Multi-step wizard; saves 'people' to familyProfile
    SuggestionsScreen.jsx          # Mode toggle (Family/Adults) + 10-card session
    MyListScreen.jsx               # Audience toggle + To Watch/Watched/Skipped tabs
    SearchScreen.jsx               # TMDB search with MovieCard responses
    SettingsScreen.jsx             # Editable household + preferences
    AuthCallbackScreen.jsx         # OAuth callback handler
```

---

## 11. Open Decisions / Known Limitations

| Item | Notes |
|---|---|
| **TMDB API key exposure** | TMDB allows public keys for free-tier apps. Consider an Edge Function proxy if abuse occurs. |
| **Irish cert coverage** | Falls back to BBFC (GB) cert if IE cert is absent. 18 and 16 included in fallback map. |
| **My List audience split by cert** | The split is cert-based (16/18 = Adults), not session-mode-based. A PG movie watched in adult mode appears in Family tab. This is by design — cert is the authoritative source. |
| **Search mode** | Search screen doesn't have a mode toggle; responses go to the cert-appropriate tab in My List automatically. |
| **Streaming data freshness** | TMDB streaming data can lag. A disclaimer ("Streaming availability may vary") is recommended but not yet shown. |
| **Parental PIN** | Flagged as Advanced. Not yet implemented. |
