# WebAppStammtisch - Änderungsprotokoll

> Neue Einträge werden oben hinzugefügt (neueste zuerst)

---

## 2026-02-13 - Push Notifications & Event-Fix

- Cloud Functions: `db.collection('events')` → `db.collection('set_events')` — Notifications fanden nie Events
- Datumsformat in Queries korrigiert: ISO-Timestamps → `yyyy-MM-dd` Strings
- Event-Formular: Überlappende Zeit/Location-Boxen auf Mobile gefixt (`min-w-0`, responsive Grid)
- Event-Formular Design-Feinschliff: Einheitliche Höhen (`h-10`), iOS-Styling angepasst (`appearance-none`), Rand-Ausrichtung korrigiert
- **Cache-Update (`v5`)**: Service Worker Version erhöht und visuellen Indikator (Platzhalter "Musterbar") hinzugefügt, um Update auf iPad zu erzwingen
- **UI-Fixes (iPad)**: `overflow-hidden` entfernt (Ursache für eckige Kanten), Grid auf `grid-cols-2` symmetriert, Border-Radius per Inline-Style erzwungen
- **Troubleshooting**: "App Reparieren"-Button jetzt für alle Nutzer sichtbar (nicht nur Admin), um Updates manuell zu erzwingen
- Cloud Functions + Hosting deployed

---

## 2026-02-13 - Reconciliation Bugfixes

- Reconciliation-Aufrufe non-blocking gemacht (Fire-and-Forget)
- Dashboard Saldo: Alle Strafen berücksichtigt, nicht nur unbezahlte

---

## 2026-02-12 - Kniffel Scorecard Rahmen & Chance-Highlighting

- Äußerer Border + lila Schatten um Spielblatt-Tabelle
- First-Come-First-Served Regel für Chance-Highlighting
- `chanceTimestamps`-Feld in KniffelSheet hinzugefügt

---

## 2026-02-04 - Push Notification Debugging & Würfel-Modal

- Service Worker Konflikt behoben (firebase-messaging-sw.js gelöscht, sw.js vereinheitlicht)
- VAPID Key neu generiert, Firebase SDK auf v10.12.2 aktualisiert
- Neues Würfelanzahl-Modal für oberen Kniffel-Bereich (Einser bis Sechser)
- „App Reparieren" Button für SW/Cache-Reset hinzugefügt

---

## 2026-02-03 - Mitglieder-Verwaltung Refactoring

- Multi-Rollen-Zuweisung implementiert (Admin bleibt einzigartig)
- Mitglieder-Namen im Edit-Popup schreibgeschützt
- E-Mail-Feld aus Mitglieder-Info entfernt

---

## 2026-02-03 - Projekt-Aufräumen

- 38 alte Conversation-Ordner gelöscht
- Vercel entfernt: `@vercel/speed-insights`, `vercel.svg`
- README.md mit Firebase-Anleitung aktualisiert
- Coding-Standards Workflow erstellt

---

## 2026-02-03 - Kniffel Vollbild-Optimierung

- CSS-basierter Fullscreen statt Browser API
- Dynamische Skalierung für 1-12 Spieler
- Mobile-Support mit `100dvh`

---

## 2026-01-31 - Deployment Debugging

- Build-Fehler für Firebase Hosting behoben
- Avatar und Button-Fixes deployed

---

## 2026-01-21 - Feature Fixes & UI Redesign

- Spacebar Auto-Press Feature debuggt
- Popup UI neu strukturiert

---

## 2026-01-16 - Mobile & Sidebar Optimierung

- Touch-Targets mindestens 44x44px
- Kniffel Scorecard: Sticky-Spalten
- Responsive Breakpoints optimiert

---

# Tech-Stack Übersicht

## Programmiersprachen
TypeScript, JavaScript

## Markup & Styling
HTML, CSS, JSX/TSX

## Frameworks & Libraries
Next.js 16, React 19, TailwindCSS 4

## Backend & Datenbank
Firebase (Firestore, Authentication, Cloud Functions v2, Hosting)

## Externe Services
Cloudinary (Bild-Upload & -Speicherung)

## Build Tools
npm, PostCSS, ESLint, Turbopack

## UI-Komponenten
Lucide React (Icons), dnd-kit (Drag & Drop), TanStack Table

## Utilities
clsx, tailwind-merge, date-fns, JSZip, exif-js

## Versionskontrolle
Git, GitHub

## Deployment
Firebase Hosting, Firebase CLI

---

# Feature-Übersicht

| Seite | Features |
|-------|----------|
| Dashboard | Quick Actions, Event-Widget, Statistik-Karten, Mitglieder-Saldo |
| Kniffel | Spielblätter, Scorecard, Drag-and-Drop, Vollbild, Gäste, Strafen, Würfel-Modal, Chance-Highlighting |
| Events | Kalender, Event-Erstellung, Monats-Übersicht, Push-Benachrichtigungen |
| Statistiken | Punkte-Matrix, Strafen-Tabelle |
| Mitglieder | Verwaltung, Avatare, Multi-Rollen, Profilseite |
| Galerie | Jahres-Ansicht, Bild-Grid |
| Kasse | Saldo, Ausgaben, Spenden, Reconciliation (FIFO), Gruppen-Ansicht |
| Hall of Fame | Bestenliste |
| Einstellungen | Push-/E-Mail-Benachrichtigungen, Admin-Tools, App-Reparatur |
