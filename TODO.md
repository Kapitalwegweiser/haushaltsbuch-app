# Haushaltsbuch App – Offene Ideen & Roadmap

---

## 1. Cloud-Lösung mit Login & Synchronisierung
**Aufwand: GROSS (ca. 2–4 Wochen)**

### Was dazugehört:
- Backend-Dienst einrichten (empfohlen: Firebase oder Supabase – beide haben kostenlosen Einstieg)
- Benutzerregistrierung & Login (E-Mail + Passwort, optional Google/Apple Login)
- Login-Bereich auf kapitalwegweiser.com einbinden
- Alle Daten (Fixkosten, variable Kosten, Einnahmen, Budgets) werden pro User in der Cloud gespeichert
- Echtzeit-Synchronisierung: Änderung auf Handy erscheint sofort auf Desktop und umgekehrt
- Datenschutz: DSGVO-konforme Umsetzung notwendig (Datenschutzerklärung anpassen, Serverstandort EU)
- Passwort vergessen / Account löschen Funktion

### Warum groß:
Jede Seite der App muss auf Cloud-Daten umgestellt werden (statt localStorage).
Login-Flow, Session-Management und Fehlerbehandlung kosten Zeit.
DSGVO-Compliance ist für deutsche Nutzer Pflicht.

---

## 2. Kassenzettel / Beleg einscannen (OCR)
**Aufwand: MITTEL bis GROSS (ca. 1–3 Wochen)**

### Was dazugehört:
- Kamera-/Datei-Upload in der App (Foto vom Kassenzettel)
- OCR-Erkennung (Text aus Bild auslesen) – empfohlen: Google Vision API oder OpenAI Vision
- KI liest Datum, Gesamtbetrag und ggf. Einzelpositionen aus
- Vorschau: "Wir haben folgendes erkannt – stimmt das?" → Nutzer bestätigt oder korrigiert
- Automatische Eintragung ins Haushaltsbuch

### Warum mittel bis groß:
Die OCR-Technologie ist vorhanden (API-Anbindung), aber Kassenzettel sind sehr unterschiedlich formatiert.
Qualität hängt stark von Fotoqualität ab → braucht gute Fehlerbehandlung.
Kostet API-Gebühren pro Scan (Google Vision / OpenAI) → Kostenmodell für Nutzer überlegen.
Auf Mobil funktioniert Kamera-Zugriff im Browser gut, auf Desktop nur Datei-Upload.

---

## Reihenfolge-Empfehlung:
1. Erst App fertigstellen & testen (aktueller Stand)
2. Cloud-Lösung → ermöglicht überhaupt erst sinnvolle Nutzerbasis
3. Kassenzettel-Scan → sinnvolles Premium-Feature nach Cloud-Launch

---
*Notiert am 07.06.2026*
