---
id: "kiniffler-stammtisch-app"
title: "KANPAI - Stammtisch Web App"
tagline: "All-in-one meetup hub featuring digital Yahtzee, automated treasury tracking, and event scheduling."
category: "webapp"
status: "production"
featured: false
badge: "Active"
problemStatement: "Organizing regular social clubs ('Stammtisch') typically suffers from fragmented communication, manual scorekeeping with pen and paper, and cumbersome cash management for collective group expenses and penalty fines. Traditional chat groups lack centralized event attendance polling, while paper-based game records and unrecorded financial obligations lead to accounting friction and lost records over time."
technicalSolution: "KANPAI provides a serverless PWA built with Next.js 16 and Firebase, delivering an interactive multiplayer Kniffel game engine alongside full event scheduling and treasury tracking. Cloud Functions automate PayPal payment reconciliation via IMAP email ingestion, while Firestore with multi-tab IndexedDB caching ensures instantaneous updates and resilient offline operation."
techStack:
  - "Next.js 16"
  - "React 19"
  - "TypeScript"
  - "Tailwind CSS 4"
  - "Firebase Firestore"
  - "Firebase Auth"
  - "Firebase Cloud Functions"
  - "Cloudinary"
  - "PWA"
architectureHighlights:
  - "Automated Financial Reconciliation via Cloud Functions & IMAP PayPal ingestion"
  - "Persistent Multi-Tab Offline Caching with Firestore & IndexedDB"
  - "Component-Driven Modular Architecture with Next.js App Router & Tailwind CSS 4"
  - "Real-Time Multiplayer Game State Synchronization with Optimistic UI Updates"
links:
  chromeWebStore: ""
  demoUrl: "https://webapp-stammtisch.web.app"
  githubUrl: "https://github.com/Mello2110/Kiniffler-Stammtisch-App"
sandbox:
  enabled: true
  type: "remote"
  embedUrl: "https://webapp-stammtisch.web.app"
  notes: "Live PWA hosted on Firebase Hosting with responsive mobile layout and guest access."
stats:
  version: "v0.1.0"
---

# KANPAI - Stammtisch Web App

[![Status](https://img.shields.io/badge/Status-Active-emerald?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#)

> All-in-one meetup hub featuring digital Yahtzee, automated treasury tracking, and event scheduling.

<!-- QUICK ACCESS / CALL TO ACTION -->
<p align="left">
  <a href="https://webapp-stammtisch.web.app"><b>🚀 Live Demo / Web App</b></a> &nbsp;|&nbsp;
  <a href="https://github.com/Mello2110"><b>🌐 Mellow Solutions Hub</b></a>
</p>

---

## 📌 Problem & Motivation
Managing regular club meetups or traditional German *Stammtisch* rounds brings recurring organizational overhead:
- **Pen-and-paper game scoreboards:** Kniffel (Yahtzee) sheets wear out, calculations are prone to errors, and cross-session statistics or long-term leaderboards are impossible to maintain.
- **Messy group treasury & penalty tracking:** Members collect penalty fines (*Strafenkatalog*) or split group expenses, leading to forgotten debts, manual spreadsheets, and confusing bank/PayPal transfers.
- **Fragmented scheduling:** Polling event dates across casual chat groups leads to missed notifications, lost confirmations, and unclear host allocations.

**KANPAI** resolves these friction points in one single place, purpose-built for regular social circles.

---

## ⚡ The Solution
KANPAI delivers a modern, high-performance Progressive Web Application (PWA) with a modular architecture:
- **Interactive Kniffel / Yahtzee Engine:** Real-time digital dice rolling with custom rules, automatic score validation, bonuses, and historical game records.
- **Automated Treasury & Ledger System:** Double-entry ledger tracking individual member balances, group savings, and penalties. Includes a serverless Firebase Cloud Function that parses PayPal payment notification emails over IMAP and automatically books credits to the correct member account.
- **Event Coordination & Token Economy:** Interactive date voting, attendance confirmations, and host badges/tokens that gamify meetup organization.
- **Zero-Latency Offline-First Sync:** Powered by Firestore's persistent multi-tab cache, ensuring full responsiveness even in basement venues with poor cellular reception.

---

## 🚀 Key Features
- **🎲 Digital Kniffel (Yahtzee) Suite:** Live game scoring, dynamic dice animations, round statistics, and personal bests.
- **💰 Smart Treasury & Penalty Pot:** Automated PayPal transaction matching, real-time member balance calculation, deposit/withdrawal ledgers, and customizable penalty rules.
- **📅 Event Calendar & Polling:** Propose meetup dates, vote on availability, confirm attendance, and assign host responsibilities.
- **🏆 Hall of Fame & Statistics:** Interactive Recharts-powered graphs analyzing win rates, total penalties paid, dice luck, and player leaderboards.
- **📸 Shared Meetup Gallery:** Integrated media uploads via Cloudinary with EXIF date/time extraction and responsive grid previews.
- **📱 PWA & Offline Support:** Installable on iOS and Android with fast loading, service worker caching, and local IndexedDB state resilience.

---

## 🛠️ Architecture & Tech Stack
- **Frontend Framework:** [Next.js 16](https://nextjs.org/) (App Router, Static HTML Export) with [React 19](https://react.dev/)
- **Programming Language:** [TypeScript](https://www.typescriptlang.org/) for strict end-to-end type safety
- **Styling & UI:** [Tailwind CSS 4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) for animations, and [Lucide React](https://lucide.dev/) icons
- **State & Tables:** React Context (`AuthContext`, `LanguageContext`), [TanStack Table v8](https://tanstack.com/table), and [Recharts](https://recharts.org/)
- **Backend & Cloud Services:**
  - **Firebase Firestore:** Document database with IndexedDB multi-tab local persistence
  - **Firebase Authentication:** Multi-provider user management (Email/Password & Google)
  - **Firebase Cloud Functions:** Node.js serverless background workers executing IMAP transaction sync
  - **Cloudinary:** Cloud asset storage for the social meetup gallery
- **Hosting & CI/CD:** Firebase Hosting paired with automated GitHub Actions deployment pipelines

---

## 📦 Installation & Usage

### Prerequisites
- **Node.js** >= 20.x
- **Firebase CLI:** `npm install -g firebase-tools`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Mello2110/Kiniffler-Stammtisch-App.git
cd Kiniffler-Stammtisch-App
npm install
cd functions && npm install && cd ..
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### 3. Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Deployment
Build the Next.js static export:
```bash
npm run build
```
Deploy hosting and cloud functions to Firebase:
```bash
firebase deploy
```

---

## 📄 License & Disclaimer
Part of the **Mellow Solutions** portfolio. Provided under the MIT License as-is for non-commercial and personal utility.
