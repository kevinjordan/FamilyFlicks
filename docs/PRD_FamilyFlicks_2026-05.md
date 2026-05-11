# PRD: FamilyFlicks

| Field | Value |
|---|---|
| **Project Name** | FamilyFlicks |
| **Owner** | TBD |
| **Runtime** | Progressive Web App (PWA) — Safari on iPhone, shareable via link |
| **Schedule** | On-demand (user-initiated sessions) |
| **Delivery Method** | In-app UI + Google Docs persistence |
| **Status** | Draft |

---

## 1. Problem Statement

Parents struggle to find movies that are genuinely appropriate for all the children in the room — not just by age rating, but accounting for each child's individual limits, past watches, and the family's language and content preferences. Scrolling streaming apps and IMDb lists wastes time and often surfaces movies already seen or clearly unsuitable. Without a record of what's been suggested and how the family responded, the same bad suggestions resurface repeatedly.

---

## 2. Target Users

| User | Who they are and why they care |
|---|---|
| **Primary — Parent / Guardian** | Sets up the app, runs suggestion sessions, rates movies. Needs quick, trustworthy picks without research overhead. |
| **Secondary — Siblings / Co-parents** | Share the same app link and GDoc, contribute ratings from their own households with their own child profiles. |

---

## 3. Key Entities / Subjects

| Entity | Notes |
|---|---|
| **Child profile** | Stored anonymously as Child 1, Child 2, etc. Holds age (not DOB), max allowed Irish cert, and nudge permission. No PII. |
| **Family settings** | Language preference, subtitles on/off, animation included/off, sibling rating default (youngest vs. eldest), streaming services subscribed. |
| **Movie record** | TMDB movie ID, title, genre(s), Irish cert, release year, language. |
| **Suggestion record** | Movie ID + session date + user response (Watched / Not Watched / Interested / Not Interested / Inappropriate). |
| **Rating record** | Movie ID + user score (1–10 slider) + date rated. Applied after a movie is marked Watched or Interested. |
| **Google Doc / Sheet** | User-owned. Stores all suggestion and rating records. Accessed via OAuth. |

---

## 4. Signal Types and Urgency Tiers

| Signal | Urgency | Logic |
|---|---|---|
| **User opens app / taps "Get Suggestions"** | Immediate | App reads GDoc history, calls TMDB + Claude, returns 10 movies. |
| **User responds to a movie card** | Immediate | Response written to GDoc before user moves to next card. No batching. |
| **User taps "Go Again"** | Immediate | Re-runs suggestion pipeline excluding all previously responded movies. |
| **User rates a Watched/Interested movie** | On interaction | Rating written to GDoc when slider is confirmed. |
| **Settings changed** | Next session | New settings apply to the next suggestion run, not the current session. |

---

## 5. Internal / Contextual Sources

| Source | Access Method | What It Provides |
|---|---|---|
| **User's Google Doc** | Google OAuth 2.0 → Google Docs API (read/write) | Persisted suggestion history, ratings, family settings backup |
| **Device local storage** | Browser `localStorage` | Family settings cache (avoids re-reading GDoc on every launch) |
| **TMDB API** | REST, free API key | Movie metadata: title, cert, genre, poster, release year, language, streaming availability |
| **Claude / Anthropic API** | REST, API key | Intelligent movie selection: filters by age cert, excludes seen titles, applies nudge logic, respects genre/language prefs |

---

## 6. Feature List

### Core (MVP)
- Onboarding / setup wizard: number of children, age per child, max cert per child, sibling rating default
- Setup: preferred language, subtitles preference, animations included/excluded
- Setup: streaming services selection (icons, pre-sorted by Irish popularity, includes US services)
- Google Sign-In OAuth flow + GDoc creation or linking
- Session screen: display 10 movie suggestion cards with poster, title, year, cert, genre, streaming flags
- Per-card response: Watched / Not Watched / Interested / Not Interested / Inappropriate
- Persist every response to GDoc immediately
- "Go Again" button: loads 10 fresh suggestions excluding all prior responses
- Settings screen: edit all setup fields post-onboarding
- Previously seen list: filter to Watched + Interested movies, rate 1–10 via slider, persist to GDoc

### Enhanced
- Child-level session selector ("who's watching tonight?") to override the youngest/eldest default
- Streaming service availability badges pulled live from TMDB
- Genre filter chips on the suggestion screen
- Decade filter chips on the suggestion screen (1980s → present)
- Swipe gestures on movie cards (swipe right = Interested, swipe left = Not Interested)
- Push to suggest a re-watch of a highly rated movie

### Advanced
- Shareable session link — siblings join the same suggestion session in real time
- Machine learning nudge: learns which genres/certs the family actually watches vs. skips
- Parental PIN lock on settings screen
- Export ratings as a formatted PDF "Family Movie List"

---

## 7. User Flow

### Automated Flow (what the system does each run)

1. App launches → checks `localStorage` for existing family settings
2. If no settings found → start onboarding wizard
3. If settings exist → attempt to load GDoc via stored OAuth token (refresh if expired)
4. Read suggestion history sheet from GDoc → build exclusion list of all previously responded movie IDs
5. Determine active rating ceiling: youngest child cert OR eldest child cert (per user's persisted preference), then apply one-level nudge if enabled per child
6. Call TMDB API: search by cert range, language, decade range, animation flag
7. Filter TMDB results against exclusion list
8. Pass filtered candidate list + family profile to Claude API → Claude selects and ranks 10 movies with rationale
9. Return 10 movie objects to UI → render cards with TMDB poster, title, cert badge, genre tags, streaming service icons
10. User responds to each card → write response to GDoc suggestions sheet immediately
11. User taps "Go Again" → repeat from step 4 (exclusion list now includes this session's responses)

### Human Experience (what the user sees and does)

1. Opens the PWA in Safari — sees a clean home screen with "Get Suggestions" button
2. First time: walks through a friendly setup wizard, selects services with icons, picks cert per child
3. Prompted to sign in with Google — one tap, then lands back in the app
4. Sees 10 movie cards — scrolls through, taps a response button on each
5. Taps "Go Again" when done — sees 10 fresh picks instantly
6. Taps "My List" to see Watched / Interested movies, drags a slider to rate them 1–10
7. Can open Settings at any time to update any preference

---

## 8. Technical Preferences

| Concern | Decision |
|---|---|
| **Runtime** | Progressive Web App — React + Vite, deployed to Vercel or Netlify |
| **Mobile target** | iOS Safari (PWA installable via "Add to Home Screen") |
| **Schedule** | On-demand only — no background jobs |
| **Movie data** | TMDB API (free tier, REST) |
| **AI suggestion engine** | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| **Authentication** | Google OAuth 2.0 (PKCE flow, no backend secret required for SPA) |
| **Persistence** | Google Sheets (within Google Drive) — two sheets: `suggestions` and `settings` |
| **Local state** | `localStorage` for settings cache; React context for session state |
| **Styling** | Tailwind CSS |
| **Error handling** | Toast notifications for API failures; graceful fallback if GDoc unreachable (offline mode shows cached list only) |
| **Analytics** | None (MVP) |
| **Hosting** | Vercel (free tier) |

---

## 9. Architecture — Numbered Build Steps

---

### Step 1 — Project Scaffold and PWA Shell

**What it does:** Creates the React + Vite project, configures it as an installable PWA, and sets up Tailwind CSS.

**Inputs:** None — greenfield project.

**Outputs:**
- `/src` folder with `App.jsx`, `main.jsx`
- `vite.config.js` with `vite-plugin-pwa`
- `manifest.webmanifest` with app name, icons, `display: standalone`
- Tailwind configured via `tailwind.config.js`
- Deployed to Vercel with a shareable URL

**Key decisions:**
- Use `vite-plugin-pwa` with Workbox for service worker — do not hand-roll a service worker
- Set `start_url: "/"` and `scope: "/"` in the manifest
- iOS Safari does not support push notifications in PWAs — do not attempt to implement them
- Icons must be provided at 192×192 and 512×512 PNG for iOS "Add to Home Screen" prompt

```json
// manifest.webmanifest
{
  "name": "FamilyFlicks",
  "short_name": "FamilyFlicks",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

### Step 2 — Onboarding Wizard UI

**What it does:** Guides a first-time user through all setup questions across 6 screens. Saves the completed profile to `localStorage` and marks onboarding as complete.

**Inputs:** User interactions (taps, selections).

**Outputs:** A `familyProfile` object saved to `localStorage`:

```json
{
  "siblingDefault": "youngest",
  "language": "en",
  "subtitles": false,
  "includeAnimation": true,
  "decadeFrom": 1990,
  "streamingServices": ["netflix", "disney_plus", "prime_video"],
  "children": [
    { "id": "child_1", "maxCert": "PG", "nudgeEnabled": true },
    { "id": "child_2", "maxCert": "12A", "nudgeEnabled": false }
  ]
}
```

**Key decisions:**

- **Screen order:** (1) How many children → (2) Age + cert per child (one sub-screen per child) → (3) Sibling default → (4) Language / subtitles / animation → (5) Decade range → (6) Streaming services
- **Irish cert order for cert picker:** G → PG → 12A → 15A (maximum selectable is 15A per scope decision; 16 and 18 not available)
- **Nudge toggle:** shown per child as "Suggest slightly older movies sometimes?" — defaults to off
- **Streaming services:** displayed as a grid of logo icons. Sort order: Netflix, Disney+, Apple TV+, Prime Video, NOW TV, SkyGo, Paramount+, Peacock, Max (HBO), Discovery+, Mubi, BritBox. Include search/filter for the full list.
- **Decade picker:** horizontal scroll of decade chips starting 1980s → 2020s. User selects the earliest decade to include.
- **No PII collected:** children stored as `child_1`, `child_2` etc. Age used only to suggest the cert — not stored as a field after setup.
- On completion, set `localStorage.setItem("onboardingComplete", "true")`

---

### Step 3 — Settings Screen

**What it does:** Re-renders the same onboarding fields in an editable form accessible from the main nav. Saves changes back to `localStorage` (and later to GDoc — see Step 5).

**Inputs:** Existing `familyProfile` from `localStorage`.

**Outputs:** Updated `familyProfile` in `localStorage`.

**Key decisions:**
- Settings screen is identical in data model to onboarding — share the same form components
- Changes take effect on the NEXT suggestion session, not the current one
- Add a "Sign out of Google" option here that clears the OAuth token but preserves local settings

---

### Step 4 — Google OAuth 2.0 Authentication

**What it does:** Authenticates the user with Google using the PKCE OAuth flow (no backend required). Stores the access token and refresh token in `localStorage`. Scopes required: `https://www.googleapis.com/auth/drive.file` (create and read files the app created).

**Inputs:** User taps "Connect Google Account" button.

**Outputs:**
- `googleAccessToken` stored in `localStorage`
- `googleRefreshToken` stored in `localStorage`
- `googleUserEmail` stored (display only — not used as identifier)

**Key decisions:**
- Use PKCE (Proof Key for Code Exchange) — this is the correct OAuth flow for SPAs with no backend
- Register the app in Google Cloud Console → OAuth 2.0 Client ID → Web application type
- Redirect URI must exactly match the deployed Vercel URL
- Token refresh: check token expiry before every GDoc call; use refresh token to get a new access token silently
- `drive.file` scope only — app can only access files it created, protecting user privacy
- Handle the case where the user denies permission gracefully: show a banner explaining GDoc sync is disabled, allow local-only mode

```javascript
// PKCE flow outline
const codeVerifier = generateRandomString(64);
const codeChallenge = await sha256(codeVerifier);
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${CLIENT_ID}
  &redirect_uri=${REDIRECT_URI}
  &response_type=code
  &scope=https://www.googleapis.com/auth/drive.file
  &code_challenge=${codeChallenge}
  &code_challenge_method=S256`;
```

---

### Step 5 — Google Sheets Persistence Layer

**What it does:** Creates or loads a Google Sheet named `FamilyFlicks_Data` in the user's Drive. Manages two sheets within it: `suggestions` and `settings`. Provides read and write functions used by all other steps.

**Inputs:** Valid Google access token.

**Outputs:** A `gdocService` module with these functions:
- `findOrCreateSheet()` → spreadsheet ID
- `readSuggestions()` → array of suggestion records
- `writeSuggestion(record)` → appends one row
- `readSettings()` → family profile object
- `writeSettings(profile)` → overwrites settings sheet

**Suggestions sheet schema (columns):**

| Column | Value |
|---|---|
| A | `tmdb_id` |
| B | `title` |
| C | `cert` |
| D | `genre` (pipe-separated) |
| E | `release_year` |
| F | `response` (Watched / Not Watched / Interested / Not Interested / Inappropriate) |
| G | `rating` (1–10, blank until rated) |
| H | `session_date` (ISO 8601) |

**Key decisions:**
- On first launch post-auth: search Drive for a file named `FamilyFlicks_Data`; if not found, create it and initialise both sheets with headers
- Use Google Sheets API v4 (`spreadsheets.values.append` for writes, `spreadsheets.values.get` for reads)
- Settings sheet: single row of JSON-serialised family profile (column A = key, column B = value) — simplest approach for a small config blob
- All writes are fire-and-forget with retry on 429/503; failures are surfaced as a non-blocking toast
- Cache the suggestion history in React context for the duration of the session to avoid repeated reads

---

### Step 6 — TMDB API Integration

**What it does:** Queries TMDB for movies matching the family profile. Returns a large candidate pool that is then passed to Claude for final selection.

**Inputs:** Family profile (cert ceiling, language, decade start, animation flag).

**Outputs:** Array of up to 100 candidate movie objects:

```json
[
  {
    "tmdb_id": 120,
    "title": "The Lord of the Rings: The Fellowship of the Ring",
    "cert": "PG",
    "genres": ["Adventure", "Fantasy"],
    "release_year": 2001,
    "language": "en",
    "poster_url": "https://image.tmdb.org/t/p/w342/...",
    "overview": "...",
    "streaming": ["netflix", "prime_video"]
  }
]
```

**Key decisions:**
- Use TMDB `/discover/movie` endpoint with these params:
  - `certification_country=IE` — Irish certs
  - `certification.lte=<ceiling>` — respect cert ceiling
  - `with_original_language=<lang>` — language filter
  - `primary_release_date.gte=<decade_start>-01-01`
  - `without_genres=16` if animation excluded (TMDB genre ID 16 = Animation)
  - `sort_by=vote_average.desc` — surface quality films
  - `vote_count.gte=200` — filter out obscure low-data films
- TMDB does not return streaming data in the discover endpoint — use `/movie/{id}/watch/providers` with `region=IE` for each returned film (batch these calls)
- TMDB API key is a public-facing env var — prefix with `VITE_` in `.env`
- Rate limit: TMDB free tier allows 40 requests/10 seconds — batch provider lookups with a small delay

---

### Step 7 — Claude API Suggestion Engine

**What it does:** Takes the TMDB candidate pool and the family profile, and returns exactly 10 movie recommendations with brief rationale for each.

**Inputs:**
- `candidates[]` — filtered TMDB movie objects (up to 100)
- `familyProfile` — cert ceiling, nudge settings, language, animation flag, decade preference
- `excludeIds[]` — all TMDB IDs already responded to (read from GDoc)

**Outputs:** Array of exactly 10 movie objects selected from the candidates, with an added `rationale` field.

**Prompt template:**

```
You are a family movie advisor. Your job is to pick exactly 10 movies from the candidate list below that are the best fit for this family.

FAMILY PROFILE:
- Children: {{child_count}} children
- Max allowed cert: {{cert_ceiling}} (Irish cinema ratings: G < PG < 12A < 15A)
- Nudge enabled: {{nudge_enabled}} — if true, you MAY include up to 2 movies rated one cert above the ceiling
- Language preference: {{language}}
- Subtitles acceptable: {{subtitles}}
- Animation included: {{include_animation}}
- Earliest decade: {{decade_from}}

ALREADY SEEN / RESPONDED (exclude these TMDB IDs entirely):
{{exclude_ids_json}}

CANDIDATE MOVIES (choose only from this list):
{{candidates_json}}

RULES:
1. Return ONLY movies from the candidate list — do not invent titles
2. Return exactly 10 movies
3. Aim for genre variety across the 10 picks
4. If nudge is enabled, no more than 2 picks may exceed the cert ceiling
5. For each pick, include a one-sentence rationale suitable for a parent

Respond in JSON only. No preamble. Schema:
[
  {
    "tmdb_id": 120,
    "title": "...",
    "cert": "PG",
    "genres": ["Adventure"],
    "release_year": 2001,
    "poster_url": "...",
    "streaming": ["netflix"],
    "rationale": "A timeless epic the whole family can enjoy together."
  }
]
```

**Key decisions:**
- Model: `claude-sonnet-4-20250514`
- `max_tokens`: 2000 (sufficient for 10 movie JSON objects)
- Temperature: default (1.0) — creativity is appropriate here
- Parse response with `JSON.parse()` wrapped in try/catch; if parse fails, retry once with a stricter prompt
- If Claude returns fewer than 10 movies (rare), surface what was returned rather than erroring

---

### Step 8 — Suggestion Session UI

**What it does:** Renders the 10 movie cards returned by Claude. User responds to each card. Responses are written to GDoc immediately. After all 10 are answered (or user taps "Go Again"), a new session can begin.

**Inputs:** Array of 10 movie objects from Step 7.

**Outputs:**
- UI state tracking which cards have been responded to
- Writes one GDoc row per response (via Step 5 `writeSuggestion()`)

**Card UI elements:**
- Movie poster (TMDB image URL)
- Title + release year
- Irish cert badge (coloured to match Irish cert convention)
- Genre tag pills
- Streaming service icons (highlighted = user subscribes, greyed = available elsewhere)
- One-sentence rationale (from Claude)
- 5 response buttons: ✅ Watched | 👀 Interested | ⏭ Not Watched | 👎 Not Interested | 🚫 Inappropriate

**Key decisions:**
- Cards displayed as a vertical scroll — not a swipe deck (simpler, more accessible on iOS)
- Enhanced tier: add swipe gestures later
- A card is "answered" as soon as any button is tapped — no undo in MVP
- "Go Again" button appears after at least 5 cards are answered (not all 10 required)
- "Inappropriate" response: write to GDoc with response = "Inappropriate", then use this as a signal to Claude in future sessions to avoid similar certs/genres

---

### Step 9 — My List Screen (Ratings)

**What it does:** Reads all Watched and Interested responses from GDoc and displays them as a scrollable list. User can drag a slider (1–10) to rate each one. Rating is saved to GDoc.

**Inputs:** GDoc suggestion history filtered to `response IN ('Watched', 'Interested')`.

**Outputs:** Updated `rating` column in GDoc suggestions sheet.

**Key decisions:**
- Slider: HTML `<input type="range" min="1" max="10" step="1">` styled with Tailwind — no third-party slider library needed
- Rating is saved on slider `onMouseUp` / `onTouchEnd` — not on every tick
- Movies without a rating show the slider in an "unrated" default state (e.g. handle at position 5, greyed out)
- Sort order: unrated first, then rated sorted by score descending
- Poster thumbnails shown at smaller size (w185 TMDB image size)

---

### Step 10 — App Shell, Navigation and Error Handling

**What it does:** Wraps all screens in a consistent shell with bottom-tab navigation. Handles global error states (API failures, auth expiry, offline mode).

**Inputs:** App-wide React context (auth state, family profile, GDoc connection status).

**Outputs:** Consistent navigation, loading states, toast notifications.

**Navigation tabs:**
1. 🎬 Suggestions (home)
2. ⭐ My List
3. ⚙️ Settings

**Key decisions:**
- Use React Router v6 with `<HashRouter>` (not `<BrowserRouter>`) — required for Vercel PWA deployments without server-side routing config
- Global loading spinner for: initial GDoc read, Claude API call, TMDB batch calls
- Toast system: use a lightweight library (`react-hot-toast`) — success, error, and info variants
- Offline detection: `navigator.onLine` listener — if offline, disable "Get Suggestions" and show banner; My List still readable from local cache
- Auth expiry: if GDoc call returns 401, silently attempt token refresh; if refresh fails, show "Reconnect Google" prompt in Settings

---

## 10. Open Decisions

| Decision | Notes / Recommendation |
|---|---|
| **TMDB API key exposure** | TMDB keys are public-facing in a SPA. TMDB allows this for free-tier apps. Consider a lightweight Vercel Edge Function proxy if key abuse becomes a concern. |
| **Claude API key exposure** | **Cannot** be exposed client-side. Must be proxied through a Vercel Edge Function or serverless function. This is a required architecture decision before build starts. |
| **GDoc structure: Sheets vs Docs** | PRD specifies Google Sheets (tabular, easier to query). Confirm this is acceptable — Google Docs (prose) would be harder to parse. Recommendation: Sheets. |
| **Multiple siblings, one GDoc or many?** | Each sibling runs their own OAuth and owns their own GDoc. There is no shared/merged GDoc in MVP. Confirm this is the intended design. |
| **TMDB Irish cert coverage** | Not all films on TMDB have Irish (IE) certs. Need a fallback: use BBFC (UK) cert if IE cert is absent, as these are closely aligned. |
| **"Go Again" session depth** | After several "Go Again" rounds, TMDB candidates may run out. Define a cap: if fewer than 10 new candidates exist, surface what's available and show a "You've seen a lot!" message. |
| **Child age vs. cert** | Setup asks for child age to infer cert. Confirm: is age used only to suggest a default cert during onboarding, or should the app automatically update the cert as the child ages over time? |
| **Streaming provider data freshness** | TMDB streaming data can lag behind reality. Consider showing a disclaimer: "Streaming availability may vary — verify before watching." |
| **Parental PIN for Settings** | Flagged as Advanced. Confirm if this is needed before public sharing with siblings who have children of their own. |
| **Vercel Edge Function for API proxy** | Claude API key must be server-side. Vercel Edge Functions are the simplest solution. Confirm Vercel is the approved host before build starts. |
