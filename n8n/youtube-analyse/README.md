# YouTube-Kanalanalyse → Google Sheet (n8n)

Der n8n-Workflow für das Briefing [`BRIEFING-youtube-analyse.md`](BRIEFING-youtube-analyse.md): Er liest alle öffentlichen Videos des Kanals *Gicht-Lotse* und schreibt pro Video eine Zeile mit allen Merkmalen in das Blatt `Videos`.

| Datei | Zweck |
|---|---|
| `youtube-analyse-workflow.json` | **In n8n importieren** (Workflows → Import from File) |
| `youtube-analyse-kopfzeile.tsv` | Kopfzeile für Zeile 1 des Blatts `Videos` (A–CM) |
| `src/*.js` | Quelltext der Code-Nodes |
| `build_workflow.py` | erzeugt die JSON-Datei aus `src/` neu (`python3 build_workflow.py`) |

## Einrichtung

1. Ziel-Sheet und Drive-Ordner `Thumbnails` anlegen und die Kopfzeile einfügen (Briefing 3.1), dazu die Google-Cloud-Einstellungen vornehmen (Briefing 3.2).
2. Die JSON-Datei importieren.
3. Im Node **Konfiguration** folgende Felder füllen:
   - `ziel_sheet_id` (Sheet „YouTube-Analyse Gicht-Lotse“) und `thumbnail_ordner_id` sind bereits eingetragen.
   - `studio_export_blatt` prüfen. Voreingestellt ist `Tabellendaten`, so heißt das Tabellenblatt bei deutschen Studio-Exporten normalerweise. Das muss im Export-Sheet geprüft werden.
   - `max_videos` steht auf `3` (Test-Modus). Mit `0` werden alle Videos verarbeitet.
4. Credentials prüfen. Sie sind über den Namen vorbelegt: „Google YouTube Data und Analyse“ (YouTube), „Google Sheets account“ (Sheets), „johein1503@gmail.com - OAuth2 API“ (Drive). Erkennt n8n sie beim Import nicht, in den Nodes von Hand auswählen:
   - **Alle YouTube-HTTP-Nodes** (Kanal holen, Upload-Playlist lesen, Video-Details, Playlists holen, Playlist-Videos holen, Kategorien holen, Analytics abrufen, Kommentare abrufen): *Authentication = Predefined Credential Type → Google OAuth2 API*, Credential „Google YouTube (RAG Pipeline)“ mit dem Scope
     `https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly`.
     Falls „Google OAuth2 API“ dort nicht angeboten wird: *Generic Credential Type → OAuth2 API* mit Authorization URL `https://accounts.google.com/o/oauth2/v2/auth`, Access Token URL `https://oauth2.googleapis.com/token`, demselben Scope und den Auth URI Query Parameters `access_type=offline&prompt=consent`.
   - **Studio-Export lesen, Zeile schreiben, Thumbnail-Formel schreiben**: Google Sheets OAuth2.
   - **Thumbnail suchen / ersetzen / hochladen**: Google Drive OAuth2.
   - **Thumbnail laden** braucht keine Credential (öffentliche URL).
5. Nach dem Import diese Punkte kontrollieren (Briefing 8): *Authentication* der HTTP-Nodes, *Operation* der Google-Nodes (Read / Append or Update / Update / Search / Upload / Update) und die Expression-Felder (Sheet-ID, Blattname, Ordner-ID).

Danach den Testplan aus Briefing 7 durchgehen. Zuerst nur den Node **Kanal holen** ausführen: Er muss den Gicht-Lotse-Kanal liefern.

## Ablauf

```
Start → Konfiguration → Kanal holen → Upload-Playlist lesen (paginiert) → Video-ID-Gruppen (je 50)
 → Video-Details → Nur öffentliche Videos → Playlists holen → Playlist-Liste → Playlist-Videos holen
 → Kategorien holen → Studio-Export lesen → Daten vorbereiten (ein Item pro Video) → Loop über Videos
   ↳ Analytics-Abfragen erzeugen (14 Items) → Analytics abrufen (ein HTTP-Node, Fehler → Spalte leer)
   → Kommentare abrufen (max. 2 × 100) → Zeile zusammenbauen → Thumbnail suchen → Thumbnail laden
   → Thumbnail vorhanden? → ja: Thumbnail ersetzen / nein: Thumbnail hochladen
   → Zeile fertigstellen (Drive-Link) → Zeile schreiben (Append or Update, Abgleich „Video-ID“)
   → Thumbnail-Formel vorbereiten → Thumbnail-Formel schreiben → Pause (1 s) → Loop
 → Fertig (Anzahl verarbeiteter Videos)
```

## Abweichungen vom Briefing (mit Begründung)

1. **Die Hauptzeile wird mit `RAW` geschrieben, die Spalte `Thumbnail` getrennt mit `USER_ENTERED`.**
   YouTube-Video-IDs können mit `-` beginnen, z. B. `-abc123defgh`. Mit `USER_ENTERED` würde Google Sheets so einen Wert als Formel deuten (Fehler in der Zelle). Außerdem würde der Abgleich über `Video-ID` beim nächsten Lauf scheitern und Dubletten erzeugen. Bei `RAW` wird alles genau so gespeichert, wie es übergeben wird:
   - Zahlen bleiben Zahlen.
   - Titel, die mit `=`, `+` oder `-` beginnen, bleiben Text. Das führende `'` aus Briefing 5 ist dadurch überflüssig.
   - Die `=IMAGE()`-Formel schreibt der Node **Thumbnail-Formel schreiben** (Operation *Update*, Abgleich `Video-ID`, `USER_ENTERED`). Er schreibt nur diese eine Spalte.

   Folge: Datum und Uhrzeit (`Veröffentlicht am`, `Uhrzeit`, `Abgerufen am`, Dauerangaben) stehen als Text im ISO-Format (`2017-04-29 14:03`) im Sheet. Sie lassen sich korrekt sortieren, sind aber keine Datumswerte. Bei Bedarf kann man die Spalten in Sheets oder Excel umwandeln.
2. **Lifetime-Startdatum = UTC-Veröffentlichungsdatum minus 1 Tag.** Die Analytics API zählt Tage in US-Pacific-Zeit. Ohne diesen Puffer fehlen bei Videos, die nach 0 Uhr UTC veröffentlicht wurden, die Zahlen des ersten Tages. Vor der Veröffentlichung gibt es keine Daten, der Puffer verfälscht also nichts. Die 3/6/12-Monats-Fenster beginnen nie davor. Der **Name** (Spalte A) nutzt wie gefordert das unveränderte UTC-Datum.
3. **Länder:** Die Abfrage holt alle Länder ohne `maxResults=3`. Erst im Code werden die Top 3 gebildet, sonst ließen sich die Anteile in % nicht berechnen.
4. **Karten-Klickrate %** wird aus `cardClicks / cardImpressions × 100` berechnet, weil die API `cardClickRate` als Verhältnis liefert. **Hat Info-Karten** ist „Ja“, wenn es Teaser- oder Karten-Impressionen gibt.
5. **Format:** Das Format wird über die Aufrufe je `creatorContentType` bestimmt: `SHORTS` → Short, `VIDEO_ON_DEMAND` → Long. Bei anderen oder fehlenden Werten (z. B. `UNSPECIFIED` bei alten Videos) gilt: Dauer ≤ 180 s → Short, sonst Long.
6. **Thumbnail in Drive:** Gibt es im Ordner schon eine Datei mit gleichem Namen, wird ihr Inhalt ersetzt (gleiche Datei-ID, der Link bleibt gleich). Sonst wird die Datei neu hochgeladen.
7. **Test-Modus:** `max_videos = 3` nimmt die drei **ältesten** öffentlichen Videos. Ihre Namen lassen sich direkt mit den Transkript-Dateien vergleichen.

## Prüfergebnisse zu den offenen Punkten (Briefing 8)

- **„Append or Update Row“ und nicht gemappte Spalten:** Der Sheets-Node (v4) schreibt beim Aktualisieren nur die Zellen der Felder, die im Input-Item vorkommen. Die Hauptzeile enthält `Info-Karten Ziele`, `Endbildschirm Ziele` und `Thumbnail` bewusst **nicht** (Mapping „Map Automatically“). Die manuellen Spalten bleiben deshalb erhalten. Leere Werte werden als `""` übergeben, damit veraltete Werte gelöscht werden. Bitte mit Testplan-Schritt 5 bestätigen: eine manuelle Zelle füllen, den Lauf wiederholen, die Zelle muss unverändert sein.
- **Analytics-Abfragen:** Sie sind nach der Channel-Reports-Doku zusammengestellt. Live testen konnte ich sie nicht, weil developers.google.com in dieser Umgebung nicht erreichbar war und keine Zugangsdaten vorliegen. Das Wichtigste:
  - Karten-Metriken sind im Basis-Report mit `filters=video==ID` zulässig.
  - `END_SCREEN` ist ein gültiger Wert von `insightTrafficSourceType`.
  - `insightTrafficSourceDetail` braucht den Filter auf `insightTrafficSourceType` sowie `sort=-views` (maxResults ≤ 25).
  - Der Retention-Report braucht genau einen Video-Filter.
  - `creatorContentType` ist eine neuere Dimension. Falls sie mit dem Video-Filter abgelehnt wird, greift automatisch die Dauer-Regel.

  Jede abgelehnte Abfrage lässt **nur ihre Spalten leer**. Die Fehlermeldung steht in der Ausgabe von *Analytics abrufen* unter `error`.
- **Studio-Export:** Den Export konnte ich nicht einsehen (privates Sheet). Die Spaltenzuordnung arbeitet deshalb tolerant:
  - Groß-/Kleinschreibung und Sonderzeichen werden ignoriert; deutsche und englische Namen werden erkannt (`Inhalt`/`Content`, `Impressionen`/`Impressions`, `Klickrate der Impressionen (%)`/`Impressions click-through rate (%)`, Endbildschirm/End screen …).
  - Die Zeile „Gesamt“ und alle Zeilen ohne gültige Video-ID werden übersprungen.
  - Fehlende Spalten bleiben leer.
  - Welche Spalten erkannt wurden, zeigt der Node *Daten vorbereiten* im Feld `studioSpalten`.
  - Zahlen im deutschen Format (`1.234`, `4,8`) werden umgerechnet.

## Bekannte Grenzen

- Der Workflow wurde nicht in einer laufenden n8n-Instanz ausgeführt. Getestet sind die Code-Nodes mit Beispieldaten und die Struktur der JSON-Datei. Die Parameter der Google-Nodes nach dem Import kontrollieren (siehe Einrichtung 5).
- Demografie-Werte bleiben bei wenigen Aufrufen leer (Datenschutz-Schwelle von YouTube).
- Sind Kommentare deaktiviert, bleiben die Kommentar-Spalten leer; `Anzahl Kommentare` kommt trotzdem aus der Data API.
