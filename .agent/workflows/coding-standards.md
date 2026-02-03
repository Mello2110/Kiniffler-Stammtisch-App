---
description: Coding standards and documentation conventions for this project
---

# Code Documentation Standards

## Code Comments

When writing or modifying code, add **section comments** to divide code into logical blocks:

```tsx
// ============================================
// SECTION NAME (e.g., STATE & HOOKS)
// ============================================

// --- Subsection (e.g., Form state) ---
const [value, setValue] = useState("");
```

### Comment Guidelines:
- Use `// ===` for major sections
- Use `// ---` for subsections
- Common sections: STATE, HOOKS, HANDLERS, HELPERS, RENDER

---

## Walkthrough Updates

**Do NOT create new walkthrough files.** Update the existing one:

### 1. Änderungsprotokoll (oben)
- Neuen Eintrag oben hinzufügen: `## YYYY-MM-DD - Kurztitel`
- 3-5 Bullet Points max pro Eintrag

### 2. Tech-Stack Übersicht (unten)
Bei Änderungen an Technologien aktualisieren:
- Neue Dependency hinzugefügt → in passende Kategorie eintragen
- Dependency entfernt → aus Liste entfernen
- Neuer Service integriert → "Externe Services" ergänzen

### 3. Feature-Übersicht (unten)
Bei Feature-Änderungen aktualisieren:
- Neue Seite erstellt → Zeile zur Tabelle hinzufügen
- Neues Feature auf bestehender Seite → Tabellenzelle ergänzen
- Feature entfernt → aus Tabelle entfernen

---

## Zusammenfassung

| Änderung | Aktion in walkthrough.md |
|----------|--------------------------|
| Code-Änderung | Neuer Eintrag im Änderungsprotokoll |
| Neue Dependency | Tech-Stack Kategorie aktualisieren |
| Neues Feature/Seite | Feature-Übersicht Tabelle ergänzen |
