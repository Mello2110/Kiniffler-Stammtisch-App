---
id: "kiniffler-stammtisch-app"
title: "KANPAI - Multi-Tenant Club & Game Platform"
tagline: "Multi-tenant club SaaS featuring modular dice & bowling games, smart treasury sync, and OKLCH theming."
category: "webapp"
status: "production"
featured: false
badge: "Active"
problemStatement: "Social clubs, bowling groups, and regular meetups struggle with fragmented scheduling, pen-and-paper scorekeeping across different pub games, and opaque treasury management. Existing single-purpose tools lack strict tenant isolation, customizable house rules, and frictionless member onboarding without exposing sensitive payment credentials."
technicalSolution: "KANPAI is a serverless multi-tenant PWA built with Next.js 16 and Firebase, isolating every club under tenant-scoped Firestore collections and security rules. It combines a modular game plugin architecture (Kniffeln, Schocken, Kegeln) with configurable house rules, invite-link onboarding, dual payment reconciliation (1-click approval and webhook/IMAP ingestion), and a dynamic OKLCH theming engine."
techStack:
  - "Next.js 16"
  - "React 19"
  - "TypeScript"
  - "Tailwind CSS 4"
  - "Firebase Firestore"
  - "Firebase Auth"
  - "Firebase Cloud Functions"
  - "OKLCH Color Engine"
  - "Cloudinary"
  - "PWA"
architectureHighlights:
  - "Strict Multi-Tenant Firestore Isolation with Role-Based Security Rules & Last-Admin Guard"
  - "Modular Game Plugin Engine (Kniffeln, Schocken, Kegeln) with Per-Discipline Season Matrices"
  - "Dual Payment Reconciliation via 1-Click Treasurer Approval, Smart-Pay QR Tokens & Webhook/IMAP"
  - "Dynamic OKLCH 2-Color Design System & Persistent Multi-Tab Offline Sync via IndexedDB"
links:
  chromeWebStore: ""
  demoUrl: "https://webapp-stammtisch.web.app"
  githubUrl: "https://github.com/Mello2110/Kiniffler-Stammtisch-App"
sandbox:
  enabled: true
  type: "remote"
  embedUrl: "https://webapp-stammtisch.web.app"
  notes: "Live multi-tenant PWA hosted on Firebase Hosting with responsive mobile bottom navigation."
stats:
  version: "v0.1.0"
---

# KANPAI - Multi-Tenant Club & Game Platform

[![Status](https://img.shields.io/badge/Status-Active-emerald?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](#)

> Multi-tenant club SaaS featuring modular dice & bowling games, smart treasury sync, and OKLCH theming.

<!-- QUICK ACCESS / CALL TO ACTION -->
<p align="left">
  <a href="https://webapp-stammtisch.web.app"><b>🚀 Live Demo / Web App</b></a> &nbsp;|&nbsp;
  <a href="https://github.com/Mello2110"><b>🌐 Mellow Solutions Hub</b></a>
</p>

---

## 📌 Problem & Motivation
Managing regular social clubs, *Stammtisch* rounds, or recreational sports groups brings recurring organizational overhead:
- **Rigid single-game & pen-and-paper tracking:** Traditional pub games like Kniffeln (Yahtzee), Schocken, and Kegeln each have group-specific house rules and penalty catalogs that paper sheets fail to standardize across seasons.
- **Opaque group treasury & payment friction:** Tracking monthly contributions, penalties, and PayPal transfers manually leads to accounting errors, while connecting personal email mailboxes to third-party servers poses security and usability hurdles.
- **Lack of scalable club isolation & onboarding:** Single-group apps cannot safely host multiple independent clubs with customizable branding, invite links, and safe admin handovers.

**KANPAI** solves these challenges in a unified, mobile-first multi-tenant platform.

---

## ⚡ The Solution
KANPAI delivers a serverless, offline-resilient Progressive Web Application (PWA) designed for independent clubs and game circles:
- **Multi-Tenant Architecture & Invite Onboarding:** Every club is strictly isolated under `/clubs/{clubId}/...` and enforced server-side via Firestore Security Rules. Admins generate expiring invite links (`/join?code=...`), manage co-admins, and are protected by a Last-Admin Guard against accidental lockouts.
- **Modular Game Arena & House Rules Engine:** Switch seamlessly between **Kniffeln**, **Schocken**, and **Kegeln**, with strictly separated per-discipline season matrices, customizable scoring/penalty rules, and a custom penalty catalog with quick-select chips.
- **Flexible Treasury & Dual Payment Sync:** Combines configurable monthly contribution schedules (1st, 15th, or last day of month) with Smart-Pay QR/reference codes (`KP-[CLUB]-[USER]-[HASH]`). Clubs choose between zero-config **1-Click Treasurer Confirmation** or automated **Inbound Payment Webhooks** (plus legacy IMAP support).
- **Dynamic OKLCH Design System:** Admins pick a primary and accent color, and the engine mathematically derives a harmonious, WCAG-balanced dark UI scale with zero horizontal overflow across mobile, tablet, and desktop.

---

## 🚀 Key Features
- **🎲 Modular Game Arena:** Live scorecards with haptic feedback (Web Vibration API) for Kniffeln, Schocken (coasters, Schock-Out, Jule, halves/finals), and Kegeln (Alle Neune, Kranz, Pudel auto-penalties).
- **⚙️ Club Studio & Ruleset Editor:** Self-service configuration of enabled disciplines, placement scoring, bonus points, custom penalty catalogs, invite links, and theme presets.
- **💰 Cash & Ledger Hub:** Unified tabs for outstanding balances & penalties, monthly contributions/donations/expenses, pending payment confirmations, and transaction history.
- **📊 Season & Analytics Hub:** Discipline-filtered season leaderboards, monthly points matrix, Recharts performance analytics, and Hall of Fame.
- **📅 Event Calendar & Polling:** Monthly availability voting, *Top Date* tracking with 1-click event creation, RSVP management, and automated birthday events.
- **📸 Shared Meetup Gallery:** Client-side image compression and EXIF date extraction uploaded to Cloudinary with yearly archive views.

---

## 🛠️ Architecture & Tech Stack
- **Languages & Frameworks:** Next.js 16 (App Router, Static Export), React 19, TypeScript, Tailwind CSS 4, Lucide Icons, Recharts.
- **Core Architecture:**
  - **Backend & Security:** Firebase Auth, Cloud Firestore (multi-tab IndexedDB persistence), strict tenant-scoped `firestore.rules`, and Firebase Cloud Functions v2 (Node.js 22) for `joinClubByInvite`, `leaveClub`, `inboundPaymentWebhook`, scheduled monthly contribution deductions, and email/push notifications.
  - **Theming & UX:** Dynamic OKLCH CSS token generator, mobile 6-tab bottom navigation, and responsive zero-horizontal-scroll layouts.

---

## 📦 Installation & Usage
1. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/Mello2110/Kiniffler-Stammtisch-App.git
   cd Kiniffler-Stammtisch-App
   npm install
   npm --prefix functions install
   ```
2. **Configure Environment:**
   Create `.env.local` with your Firebase client config (`NEXT_PUBLIC_FIREBASE_*`) and Cloudinary preset (`NEXT_PUBLIC_CLOUDINARY_*`).
3. **Run Locally & Build:**
   ```bash
   npm run dev          # Local development server (http://localhost:3000)
   npm run build        # Static production export to out/
   ```
4. **Deploy to Firebase:**
   ```bash
   firebase deploy --only firestore:rules,functions,hosting
   ```

---

## 📄 License & Disclaimer
Part of the **Mellow Solutions** portfolio. Provided under the MIT License as-is for non-commercial and personal utility.
