# KANPAI - Stammtisch Web App

Eine Web-App für deinen regelmäßigen Stammtisch mit Kniffel-Spielen, Event-Management, Mitgliederverwaltung und mehr.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Static Export)
- **Styling:** TailwindCSS 4
- **Backend:** Firebase (Firestore, Auth, Functions, Hosting)
- **Sprache:** TypeScript

## Getting Started

### Voraussetzungen

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`

### Installation

```bash
npm install
cd functions && npm install && cd ..
```

### Entwicklung

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Deployment

### Build & Deploy zu Firebase

```bash
npm run build
firebase deploy
```

### Nur Hosting deployen

```bash
npm run build
firebase deploy --only hosting
```

### Nur Functions deployen

```bash
firebase deploy --only functions
```

## Projektstruktur

```
├── src/
│   ├── app/           # Next.js App Router Pages
│   ├── components/    # React-Komponenten
│   ├── contexts/      # React Contexts (Auth, Language)
│   ├── lib/           # Utilities, Firebase Config
│   └── types/         # TypeScript Typen
├── functions/         # Firebase Cloud Functions
├── public/            # Statische Assets
└── out/               # Build Output für Firebase Hosting
```
