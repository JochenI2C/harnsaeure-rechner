# BRIEFING: Harnsäure-Rechner (Ernährung → geschätzter Harnsäurewert)

Stand: 07.10.2026 (aktualisiert im Vibe-Coding-Seminar 121WATT)
Auftraggeber: Jochen Hein, Ernährungsberater für Gicht

> Hinweis an den Coding-Agenten: Antworte und kommentiere auf Deutsch. Der Nutzer ist Einsteiger – Code verständlich kommentieren. Punkte mit **[OFFEN]** sind noch nicht bestätigt: als Annahme umsetzen und im Code so kennzeichnen, dass sie leicht änderbar sind (alle Werte zentral in einem Konfigurations-Objekt am Anfang des Skripts).

---

## 1. Ziel und Ablauf

Ein spielerisches Web-Tool für die eigene WordPress-Seite. Ablauf in drei Schritten:

1. **Schritt 1 – „So esse ich heute“:** Abfrage der heutigen Verzehrhäufigkeit je Lebensmittelgruppe (Milchprodukte, Vitamin C, Kaffee, Fleisch/Fisch, Fructose/Zucker, Alkohol) per Schieberegler, bezogen auf **eine Woche = 7 Tage**.
2. **Schritt 2 – Harnsäurewert:** Abfrage des aktuellen Harnsäurewerts, **falls bekannt** (optional).
3. **Schritt 3 – „So möchte ich essen“:** Die Schieberegler starten auf den Werten aus Schritt 1 (Heute-Position bleibt als kleine graue Markierung sichtbar). Der Nutzer verändert sie und sieht **live** den geschätzten neuen Harnsäurewert auf einem **Tacho**.

Navigation mit Buttons „Weiter“ / „Zurück“; ein Fortschrittsanzeiger (Schritt 1 von 3) oben.

Grobe Schätzung auf Basis statistischer Durchschnittswerte aus Studien – **ausdrücklich keine medizinische Beratung**.

---

## 2. Eingabe: aktueller Harnsäurewert (Schritt 2, optional)

- Option „Ich kenne meinen Wert nicht“. Verhalten in diesem Fall: **[OFFEN]**
- Skala von **4 mg/dl** bis **12 mg/dl**.
- Beschriftung der Enden: „≤ 4 mg/dl“ (links) und „≥ 12 mg/dl“ (rechts).
- Schrittweite 0,1 mg/dl, Anzeige mit deutschem Komma (z. B. „6,5 mg/dl“).
- Eingabe per Schieberegler **und** Zahlenfeld (beide synchron). **[OFFEN]**
- Startwert: 7,0 mg/dl. **[OFFEN]**

## 3. Ausgabe: geschätzter neuer Harnsäurewert als Tacho

- Halbkreis-Tacho mit Zeiger (Inline-SVG), Skala **4 bis 12 mg/dl**.
- **Links niedrig = grün**, **rechts hoch = rot**, dazwischen gelb.
- Farbzonen (Ampel) **[OFFEN – Grenzen bestätigen]**:
  - < 6,0 mg/dl: grün – „Zielbereich“
  - 6,0 – 6,7 mg/dl: gelb
  - ≥ 6,8 mg/dl: rot – „über der Löslichkeitsgrenze“
- Zeiger bewegt sich **animiert** (weich), wenn Schieberegler verändert werden.
- Der **Ausgangswert** wird als dezente Markierung auf der Skala angezeigt, der **neue Wert** als Zeiger, damit die Veränderung sichtbar wird. **[OFFEN]**
- Zusätzlich große Zahl unter dem Tacho: z. B. „6,1 mg/dl (−0,9)“.
- Werte unter 4 bzw. über 12 werden am Skalenende angezeigt („≤ 4“ / „≥ 12“), die Zahl darunter zeigt den rechnerischen Wert.
- **Keine** Risiko-Prozentangaben.

---

## 4. Lebensmittelgruppen und Schieberegler

### Anordnung
- Alle Schieberegler **untereinander** (von oben nach unten), zuerst die **Dos**, dann die **Don'ts**.
- **Alle Schieberegler laufen in dieselbe Richtung: links = ungünstig, rechts = ideal.** So bedeutet „nach rechts schieben“ immer „besser für die Harnsäure“.
  - **Dos** (grün): Menge steigt **von links nach rechts** (links wenig, rechts viel).
  - **Don'ts** (orange): Menge steigt **von rechts nach links** (links viel, rechts wenig/selten).
- Optional: dezenter Farbverlauf in der Regler-Spur von rot/orange (links) nach grün (rechts).
- Jede Gruppe mit Icon/Piktogramm (Inline-SVG) und Anzeige des eingestellten Wertes in Klartext (z. B. „3 Tassen pro Woche“, „1× pro Monat oder seltener“).
- Skalen und Beschriftungen werden anhand eines ersten Beispiels gemeinsam überprüft.

### Dos (Zeitraum: 1 Woche)

| Gruppe | Ungünstig (0 %) | Ideal (100 %) | Schieberegler | Max. Effekt |
|---|---|---|---|---|
| Milchprodukte, fettarm | 0 Portionen/Woche | 7 Portionen/Woche (1 pro Tag) | 0 – 7, Schritt 1 | −0,2 mg/dl |
| Vitamin C | 0 Tage/Woche | 7 Tage/Woche mit je **400 mg** | 0 – 7 Tage, Schritt 1 **[OFFEN]** | −0,2 mg/dl |
| Kaffee | 0 Tassen/Woche | 28 Tassen/Woche (4 pro Tag) | 0 – 28, Schritt 1 | −0,2 mg/dl |

Zwischenwerte linear: Anteil = eingestellter Wert ÷ Idealwert (z. B. 14 Tassen Kaffee = 50 %).

### Don'ts (Zeitraum: 1 Woche)

Umrechnung: 1 Monat ≈ 4,3 Wochen → „1× pro Monat“ ≈ 0,23 pro Woche, „2× pro Monat“ ≈ 0,47 pro Woche.
Der ungünstige Wert ist ein **Grenzwert**: alles darüber zählt ebenfalls als 0 % (Effekt ist gedeckelt).

| Gruppe | Ungünstig (0 %) | Ideal (100 %) | Max. Effekt |
|---|---|---|---|
| Fleisch, Innereien, Fisch, Meeresfrüchte | ≥ 2× pro Woche | ≤ 1× pro Monat (0,23/Woche) | −0,4 mg/dl |
| Fructose, Zucker (z. B. Softdrink, Saft, Süßes) | ≥ 7× pro Woche (täglich) | ≤ 1× pro Monat (0,23/Woche) | −0,3 mg/dl |
| Alkohol (Bier, Spirituosen) | ≥ 7× pro Woche (täglich) | ≤ 1× pro Monat (0,23/Woche) | −0,5 mg/dl |

**Anteil (linear nach Häufigkeit pro Woche):**
```
Anteil = (Grenzwert − Häufigkeit) / (Grenzwert − 0,23)   (begrenzt auf 0 … 1)
```

**Reglerstufen (links → rechts) mit berechnetem Anteil:**

Fleisch, Innereien, Fisch, Meeresfrüchte (Grenzwert 2/Woche):

| Stufe | pro Woche | Anteil | Effekt ggü. ungünstig |
|---|---|---|---|
| 2× pro Woche oder mehr | 2 | 0 % | 0,00 |
| 1–2× pro Woche (≈ 1,5) | 1,5 | 28 % | −0,11 |
| 1× pro Woche | 1 | 56 % | −0,23 |
| 2× pro Monat | 0,47 | 86 % | −0,35 |
| 1× pro Monat oder seltener | 0,23 | 100 % | −0,40 |

Fructose/Zucker (Grenzwert 7/Woche) und Alkohol (Grenzwert 7/Woche):

| Stufe | pro Woche | Anteil | Effekt Fructose | Effekt Alkohol |
|---|---|---|---|---|
| täglich oder öfter | 7 | 0 % | 0,00 | 0,00 |
| 5× pro Woche | 5 | 30 % | −0,09 | −0,15 |
| 3× pro Woche | 3 | 59 % | −0,18 | −0,30 |
| 1× pro Woche | 1 | 89 % | −0,27 | −0,44 |
| 2× pro Monat | 0,47 | 96 % | −0,29 | −0,48 |
| 1× pro Monat oder seltener | 0,23 | 100 % | −0,30 | −0,50 |

Portionsgrößen (Text unter dem Regler) **[OFFEN]**, Vorschlag: Fleisch/Fisch 1 Portion ≈ 150 g; Fructose 1 Portion ≈ 1 Glas Saft/Softdrink (0,25 l) oder vergleichbare Süßigkeit; Alkohol 1 Portion ≈ 0,3 l Bier, 0,15 l Wein oder 2 cl Spirituose.

Summe aller maximalen Effekte: **−1,8 mg/dl**. Effekte werden addiert.

---

## 5. Berechnung

Für jede Gruppe gibt es einen Wert **„heute“** und einen Wert **„neu“**.

```
Anteil = Position zwischen ungünstig (0) und ideal (1)
Neuer Wert = Ausgangswert − Σ ( MaxEffekt × (Anteil_neu − Anteil_heute) )
```

- Verschlechterung ist möglich (Anteil_neu < Anteil_heute → Wert steigt).
- Ergebnis auf eine Nachkommastelle runden.

„Heute“ = Werte aus Schritt 1, „neu“ = Werte aus Schritt 3 (siehe Abschnitt 1).

---

## 6. Weitere Inhalte

- Gut sichtbarer **Disclaimer** (keine medizinische Beratung, grobe Schätzung, Rücksprache mit Arzt).
- **Aufklappbare Quellenangaben** (Studien). **[OFFEN – Quellen liefern]**
- **CTA-Button** (z. B. Beratungsgespräch). **[OFFEN – Text und Link]**
- Später: weitere Faktoren Bewegung und Körpergewicht/BMI.

## 7. Design

- Dos grün, Don'ts orange, Tacho grün → gelb → rot.
- Markenfarben der Zielseite übernehmen. **[OFFEN – gicht-coach.de oder gicht-lotse.de?]**
- Mobilfähig (Schieberegler gut mit dem Finger bedienbar, Tacho skaliert mit).

## 8. Technik

- **Eine einzige HTML-Datei** (HTML, CSS, JavaScript), Dateiname klein: `harnsaeure-rechner.html`.
- **Keine externen Ressourcen** (keine Google Fonts, CDNs, Bibliotheken, Tracking) – DSGVO.
- **Keine Datenübertragung**: alle Eingaben bleiben im Browser.
- CSS **gekapselt** (alle Klassen mit Präfix, z. B. `hr-`, alles in einem Container `#harnsaeure-rechner`), damit die Datei per Block „Individuelles HTML“ in WordPress (Kadence / GeneratePress) eingebunden werden kann, ohne das Theme zu stören.
- Alle Zahlenwerte (Skalen, Effekte, Stufen, Ampelgrenzen) zentral in einem Konfigurations-Objekt `CONFIG` am Anfang des Skripts.
- Code auf Deutsch kommentieren.

## 9. Vorgehen

1. Grundfunktion: Eingabe Harnsäurewert, Schieberegler, Live-Berechnung, einfache Zahlenausgabe.
2. Tacho, Design, Icons, Ampelfarben.
3. Texte, Disclaimer, Quellen, CTA, Mobiltest.

Nach jedem Schritt: im Browser prüfen (Cmd + R) → Commit → Sync Changes.

## 10. Offene Punkte (Übersicht)

- [x] Richtung der Schieberegler: alle links = ungünstig, rechts = ideal (Don'ts von rechts nach links)
- [x] Don'ts: Wochenwerte berechnet (Abschnitt 4), Grenzwerte gedeckelt
- [x] Ablauf: 1. Verzehr heute → 2. Harnsäurewert (optional) → 3. Verzehr neu + Tacho
- [ ] Skalen und Stufen am ersten Beispiel prüfen
- [ ] Verhalten, wenn der Harnsäurewert unbekannt ist
- [ ] Vitamin C: Tage pro Woche mit 400 mg oder mg pro Tag (0–400)?
- [ ] Portionsgrößen bestätigen
- [ ] Ampelgrenzen bestätigen
- [ ] Zielwebseite, Markenfarben, CTA-Text und -Link, Quellen
