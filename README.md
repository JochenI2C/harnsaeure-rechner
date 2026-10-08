# Harnsäure-Rechner – mobile App (Liquid Glass)

Mobile Version des Harnsäure-Rechners für **Gicht-Lotse** – optimiert für die Nutzung unterwegs auf dem Smartphone.

**Datei:** `harnsaeure-rechner.html` – einfach im Browser öffnen. `index.html` leitet automatisch dorthin weiter (für GitHub Pages). Eine einzige Datei, keine externen Ressourcen, keine Datenübertragung (DSGVO).

## Was ist neu gegenüber der Desktop-Version?

- **Liquid-Glass-Design** in den Gicht-Lotse-Farben (Blau #3383C5, Türkis #8FCEC8, Grün/Gelb/Orange/Rot aus der Farbpalette).
- **Navigation im Daumenbereich:** schwebende Leiste unten mit „Weiter“ / „Zurück“ (berücksichtigt iPhone-Home-Balken).
- **‹ / › Tipp-Knöpfe** neben jedem Regler – genaue Einstellung ohne Fummeln.
- **Schritt 2:** große Zahl mit − / + (gedrückt halten = läuft weiter), Ampel-Hinweis direkt beim Eingeben, iOS-Schalter „Ich kenne meinen Wert nicht“.
- **Schritt 3:** kompakter Tacho bleibt beim Scrollen oben sichtbar, Zahl läuft weich mit; jede Karte zeigt ihren eigenen Effekt („−0,11 mg/dl“); Schnellknöpfe „Wie heute“ und „Alles ideal“.
- **Merkt sich die Eingaben** lokal auf dem Gerät (localStorage) – nach einer Unterbrechung geht es an derselben Stelle weiter. Löschen über das „i“-Menü.
- **CTA „Beratung vereinbaren“** erscheint im Ergebnis-Schritt direkt in der unteren Leiste.
- Kann auf dem iPhone über *Teilen → Zum Home-Bildschirm* wie eine App abgelegt werden.

## Anpassen

Alle Zahlen und Texte (Skalen, Effekte, Ampelgrenzen, CTA, Quellen) stehen zentral im `CONFIG`-Objekt am Anfang des Skripts. Annahmen sind mit **[OFFEN]** markiert (siehe Briefing).

## Weitere Dateien

- `harnsaeure-rechner-wordpress.html` – die bisherige Version zum Einbetten in WordPress (Block „Individuelles HTML“).
- `BRIEFING-Harnsaeure-Rechner.md` – Anforderungen und offene Punkte.
