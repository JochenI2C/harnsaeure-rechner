# Briefing für Claude Code: YouTube-Kanalanalyse → Google Sheet (n8n)

> **Auftraggeber:** Jochen Hein, Ernährungsberater für Gicht
> **Kanal:** https://www.youtube.com/@jochenhein-gicht-lotse (ca. 45 öffentliche Videos, seit April 2017)
> **Umsetzung:** n8n (n8n Cloud), Ausgabe in **ein** Google-Sheet-Blatt, **eine Zeile pro Video**
> **Bezug:** ergänzt das Dokument `youtube-transkript-workflow-zusammenfassung.md` (Transkript-Workflow, gleiche Namenskonvention)
> Stand: Oktober 2026

---

## 1. Ziel

Für jedes **öffentliche** Video des Kanals alle unten aufgeführten Merkmale abrufen, berechnen und **als eine Zeile** in das Blatt `Videos` eines Google Sheets schreiben. Jochen öffnet das Sheet später in Excel und gruppiert, blendet ein und aus. Deshalb gilt:

- **Alle Merkmale in einem Blatt**, eine Spalte pro Merkmal, Spalten nach Gruppen sortiert (siehe Spalte „Gruppe“ in Abschnitt 6).
- Die Zeile wird **erst geschrieben, wenn alle Merkmale eines Videos fertig sind**.
- **Spalte A „Name“** ist wie die Transkript-Dateien aufgebaut:
  `2017-04-29-Gicht Warum ist mein Harnsäure-Wert erhöht?-TS`

---

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Plattform | n8n Cloud |
| Ausgabe | 1 Blatt `Videos`, 1 Zeile pro Video, alle Merkmale als Spalten |
| Name (Spalte A) | `JJJJ-MM-TT-<Titel>-TS` – Datum = **UTC-Datum** aus `publishedAt` (wie im Transkript-Workflow, damit die Namen exakt übereinstimmen); `/` und `\` im Titel → `-`; Titel getrimmt |
| Erneuter Lauf | **Append or Update** mit Abgleich über Spalte `Video-ID`: vorhandene Zeile aktualisieren, neue Videos anhängen |
| Manuelle Spalten | `Info-Karten Ziele` und `Endbildschirm Ziele` werden von n8n **nie** geschrieben/überschrieben |
| CTR & Impressionen | aus dem **YouTube-Studio-Export** (Google Sheet, siehe 3.3) – volle Lifetime-Historie; **keine** Reporting API |
| Endbildschirm-Kennzahlen | ebenfalls aus dem Studio-Export, sofern dort enthalten |
| Thumbnail | (a) kleine Vorschau **in der Zelle** per `=IMAGE()` (120×90) und (b) **physische Kopie** (320×180 JPG) in einem Drive-Ordner `Thumbnails` |
| Google-Konto | Kanal **und** Google-Cloud-Projekt „RAG Pipeline“ gehören **johein1503@gmail.com** |

---

## 3. Vorbereitung (vor dem ersten Lauf, durch Jochen)

### 3.1 Ziel-Sheet anlegen – **ja, vorher anlegen**

1. In Google Drive ein neues Google Sheet anlegen, Name z. B. **`YouTube-Analyse Gicht-Lotse`**.
2. Das erste Tabellenblatt in **`Videos`** umbenennen.
3. Die Kopfzeile in Zeile 1 einfügen: Datei `youtube-analyse-kopfzeile.tsv` öffnen, Inhalt kopieren, Zelle **A1** anklicken, einfügen (Tabulator-getrennt → verteilt sich automatisch auf die Spalten A bis CM).
4. Zeile 1 fixieren (Ansicht → Fixieren → 1 Zeile).
5. Einen Drive-Ordner **`Thumbnails`** anlegen (z. B. neben dem Sheet).
6. Sheet-ID und Ordner-ID notieren (Teil der URL nach `/d/` bzw. `/folders/`) → in den n8n-Node `Konfiguration`.

Hintergrund: Der n8n-Google-Sheets-Node „Append or Update Row“ ordnet Werte über die **Spaltenüberschriften** zu; die Kopfzeile muss deshalb vorhanden sein und exakt den Spaltennamen in Abschnitt 6 entsprechen.

### 3.2 Google Cloud „RAG Pipeline“ für YouTube vorbereiten

Für YouTube Data API **und** YouTube Analytics API wird eine eigene OAuth-Credential gebraucht (die n8n-eigene YouTube-Credential enthält **keinen** Analytics-Scope).

1. Google Cloud Console → Projekt **RAG Pipeline** → **APIs und Dienste → Bibliothek** → aktivieren:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
2. **Google Auth Platform → Datenzugriff**: Scopes hinzufügen
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/yt-analytics.readonly`
3. **Zielgruppe**: `johein1503@gmail.com` als Testnutzer (App bleibt im Testmodus).
4. **Clients → Client erstellen** → Typ *Webanwendung* → als *Autorisierte Weiterleitungs-URI* die **OAuth Redirect URL** aus der n8n-Credential eintragen (siehe 3.4). Client-ID und Client-Secret kopieren.

**Hinweis Testmodus:** Refresh-Tokens laufen nach 7 Tagen ab. Für gelegentliche, manuelle Läufe reicht das – vor einem Lauf ggf. in der Credential „Reconnect“ klicken. Für dauerhaften Betrieb müsste die App (Branding ausfüllen) veröffentlicht werden.

**Brand-Konto:** Falls der Kanal als Brand-Konto geführt wird, im Google-Anmeldefenster den **Kanal** (nicht das persönliche Profil) auswählen. `channels.list?mine=true` muss den Gicht-Lotse-Kanal zurückgeben – das ist der erste Test.

### 3.3 Studio-Export (liegt bereits vor)

- Google Sheet: `https://docs.google.com/spreadsheets/d/1ZvIM94GocOg7WEkoRqyPzVvIJ1UNRax8BCjef_pCfIc/edit`
- **Spreadsheet-ID:** `1ZvIM94GocOg7WEkoRqyPzVvIJ1UNRax8BCjef_pCfIc`
- Inhalt (Annahme, von Claude Code beim Aufbau prüfen): YouTube-Studio → Analytics → Erweiterter Modus → Inhalt → Zeitraum „Gesamter Zeitraum“ → Export als Google Sheet. Typische (deutsche) Spalten: `Inhalt` (= Video-ID), `Videotitel`, `Veröffentlichungszeitpunkt des Videos`, `Dauer`, `Aufrufe`, `Wiedergabezeit (Stunden)`, `Abonnenten`, `Impressionen`, `Klickrate der Impressionen (%)`; ggf. Endbildschirm-Kennzahlen.
- Studio-Exporte enthalten meist eine **Summenzeile „Gesamt“** direkt unter der Kopfzeile → überspringen.
- Abgleich über die **Video-ID** (Spalte `Inhalt`), nicht über den Titel.
- Spaltenzuordnung **tolerant** bauen (Groß-/Kleinschreibung, deutsch/englisch, z. B. `Impressions click-through rate (%)`), und **fehlende Spalten leer lassen statt abzubrechen**.
- Falls Endbildschirm-Kennzahlen fehlen: Jochen kann den Export in Studio um die Messwerte *Endbildschirm-Elementklicks*, *-impressionen*, *Klickrate der Endbildschirm-Elemente* ergänzen und neu exportieren.

### 3.4 Credentials in n8n

| Credential | Typ in n8n | Verwendet für |
|---|---|---|
| **Google YouTube (RAG Pipeline)** | *Google OAuth2 API* (generisch) mit Client-ID/Secret aus 3.2, Scope: `https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly` | alle HTTP-Requests an YouTube Data API und YouTube Analytics API |
| **Google Sheets** | *Google Sheets OAuth2 API* („Sign in with Google“) | Studio-Export lesen, Zielblatt schreiben |
| **Google Drive** | vorhandene *Google Drive OAuth2 API* (johein1503@gmail.com) | Thumbnails hochladen |

Safari: Pop-ups für die n8n-Domain erlauben, sonst scheitert „Sign in with Google“.

---

## 4. Workflow-Architektur (n8n)

```
[Start (manuell)]
  → [Konfiguration]                     Set-Node mit allen Parametern (4.1)
  → [Kanal holen]                       Data API channels.list?part=id,contentDetails&mine=true
  → [Upload-Playlist lesen]             Data API playlistItems.list (uploads-Playlist, maxResults=50, Paginierung)
  → [Video-Details]                     Data API videos.list?part=snippet,contentDetails,statistics,status (je 50 IDs)
  → [Nur öffentliche Videos]            Filter status.privacyStatus == 'public'
  → [Playlists-Zuordnung]               Data API playlists.list?mine=true + playlistItems.list je Playlist → Map videoId → Playlist-Titel
  → [Kategorien]                        Data API videoCategories.list?regionCode=DE&hl=de → Map categoryId → Name
  → [Studio-Export lesen]               Google Sheets: Spreadsheet 1ZvIM94G… → Map videoId → Impressionen/CTR/Endbildschirm
  → [Loop über Videos]                  Split in Batches (1)
      → [Analytics-Abfragen erzeugen]   Code: erzeugt ~16 Items (eine pro Abfrage in 4.3), jeweils {key, url}
      → [Analytics abrufen]             HTTP Request (GET {{$json.url}}, Credential „Google YouTube“, On Error: Continue)
      → [Kommentare abrufen]            HTTP Request Data API commentThreads.list (Paginierung bis max. 200)
      → [Zeile zusammenbauen]           Code: alle Ergebnisse + Video-Details + Maps → ein Objekt mit allen Spalten aus Abschnitt 6
      → [Thumbnail laden]               HTTP Request https://i.ytimg.com/vi/<ID>/mqdefault.jpg (Response: File)
      → [Thumbnail in Drive]            Google Drive Upload → Ordner „Thumbnails“, Name = <Name>.jpg (vorhandene Datei ersetzen)
      → [Zeile schreiben]               Google Sheets „Append or Update Row“, Match-Spalte „Video-ID“
      → zurück zum Loop
  → [Fertig]                            optional: Anzahl verarbeiteter Videos ausgeben
```

Designprinzipien:

- **Alle Analytics-Abfragen eines Videos über einen einzigen HTTP-Request-Node** (Items-Muster: ein Item pro Abfrage), danach in einem Code-Node per `key` zusammenführen. Das hält den Workflow übersichtlich.
- **Fehlertoleranz:** Liefert eine Abfrage einen Fehler oder keine Zeilen (z. B. Demografie unter der Datenschutz-Schwelle), bleibt die Spalte leer – der Lauf läuft weiter.
- **Rate-Limits:** zwischen Videos 1–2 s warten (Wait-Node oder Batch-Intervall im HTTP-Node). Kontingent der Data API (10.000 Einheiten/Tag) reicht für 45 Videos bei Weitem.
- **Test-Modus:** Parameter `max_videos` in der Konfiguration (z. B. 3) begrenzt die Anzahl.

### 4.1 Konfiguration (Set-Node)

| Feld | Beispiel | Zweck |
|---|---|---|
| `ziel_sheet_id` | *(ID des neuen Sheets)* | Ausgabe |
| `ziel_blatt` | `Videos` | Ausgabe |
| `studio_export_sheet_id` | `1ZvIM94GocOg7WEkoRqyPzVvIJ1UNRax8BCjef_pCfIc` | CTR/Impressionen |
| `studio_export_blatt` | *(Name des Tabellenblatts im Export – von Claude Code prüfen)* | |
| `thumbnail_ordner_id` | *(ID des Drive-Ordners „Thumbnails“)* | Thumbnails |
| `max_videos` | `3` (Test) / `0` = alle | Testbegrenzung |
| `zeitzone` | `Europe/Berlin` | Anzeige von Datum/Uhrzeit |

### 4.2 YouTube Data API v3 – Aufrufe

Basis: `https://www.googleapis.com/youtube/v3/`

| Aufruf | Parameter | liefert |
|---|---|---|
| `channels` | `part=id,contentDetails&mine=true` | Kanal-ID, `contentDetails.relatedPlaylists.uploads` |
| `playlistItems` | `part=contentDetails&playlistId=<uploads>&maxResults=50&pageToken=…` | alle Video-IDs |
| `videos` | `part=snippet,contentDetails,statistics,status&id=<bis zu 50 IDs>` | Stammdaten, Beschreibung, Tags, Thumbnails, Dauer, Status, Zähler |
| `playlists` | `part=snippet&mine=true&maxResults=50` | Playlists des Kanals |
| `playlistItems` | `part=contentDetails&playlistId=<je Playlist>` | Zuordnung Video → Playlist |
| `videoCategories` | `part=snippet&regionCode=DE&hl=de` | Kategorienamen |
| `commentThreads` | `part=snippet&videoId=<ID>&maxResults=100&order=time&textFormat=plainText&pageToken=…` | Kommentare (max. 200 je Video) |

### 4.3 YouTube Analytics API – Abfragen pro Video

Basis: `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&filters=video==<ID>&startDate=…&endDate=<heute>`

`startDate` für „Lifetime“ = UTC-Veröffentlichungsdatum des Videos. Zeitfenster 3/6/12 Monate = heute minus 3/6/12 Monate, aber **nie vor** dem Veröffentlichungsdatum.

| key | Zeitraum | dimensions | metrics | weitere Parameter |
|---|---|---|---|---|
| `basis` | Lifetime | – | `views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost` | |
| `wz_3m` | 3 Mon. | – | `views,estimatedMinutesWatched` | |
| `wz_6m` | 6 Mon. | – | `views,estimatedMinutesWatched` | |
| `wz_12m` | 12 Mon. | – | `views,estimatedMinutesWatched` | |
| `karten` | Lifetime | – | `cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks` | |
| `format` | Lifetime | `creatorContentType` | `views` | |
| `quellen` | Lifetime | `insightTrafficSourceType` | `views` | |
| `suche` | Lifetime | `insightTrafficSourceDetail` | `views` | `filters=video==<ID>;insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=10` |
| `extern` | Lifetime | `insightTrafficSourceDetail` | `views` | `filters=video==<ID>;insightTrafficSourceType==EXT_URL&sort=-views&maxResults=10` |
| `bindung` | Lifetime | `elapsedVideoTimeRatio` | `audienceWatchRatio,relativeRetentionPerformance` | |
| `demografie` | Lifetime | `ageGroup,gender` | `viewerPercentage` | |
| `laender` | Lifetime | `country` | `views` | `sort=-views&maxResults=3` |
| `geraete` | Lifetime | `deviceType` | `views` | |
| `abostatus` | Lifetime | `subscribedStatus` | `views` | |

**Von Claude Code zu prüfen:** Ob jede Kombination aus dimensions/metrics/filters so zulässig ist (Tabellen unter „Channel Reports“ der Analytics-API-Doku). Falls eine Kombination abgelehnt wird: Abfrage aufteilen oder Metrik weglassen und im Briefing-Ergebnis vermerken. Insbesondere prüfen: Karten-Metriken zusammen mit Video-Filter; `creatorContentType` mit Video-Filter; Gültigkeit von `END_SCREEN` als Zugriffsquelle.

### 4.4 Thumbnail

- **In der Zelle (klein):** Spalte `Thumbnail` erhält die Formel `=IMAGE("https://i.ytimg.com/vi/<ID>/default.jpg")` (120×90 px). Der Sheets-Node muss dafür mit **„Let Google Sheets format“ (USER_ENTERED)** schreiben.
- **Physisch:** `https://i.ytimg.com/vi/<ID>/mqdefault.jpg` (320×180 px, ca. 10–20 KB) per HTTP-Request als Datei laden und in den Drive-Ordner `Thumbnails` hochladen; Dateiname = Wert der Spalte `Name` + `.jpg`. Bei erneutem Lauf vorhandene Datei ersetzen bzw. überspringen. Link zur Datei in Spalte `Thumbnail-Datei (Drive)`.
- Hinweis für Excel: Beim Download als .xlsx bleibt `=IMAGE()` eine Formel mit URL (Excel 365 kennt `BILD()`); die physischen JPGs liegen zusätzlich in Drive.

---

## 5. Regeln für Werte und Formate

- **Zahlen als Zahlen** an Google Sheets übergeben (JSON-Number), **nicht als Strings** – sonst interpretiert ein deutsches Sheet „12.5“ als Datum/Text. Prozentwerte als Zahl (z. B. `4.8` für 4,8 %), auf 1–2 Nachkommastellen runden.
- **Wiedergabezeit** in Stunden (Minuten ÷ 60), 1 Nachkommastelle.
- **Datum/Uhrzeit** zur Anzeige in `Europe/Berlin`, Format `JJJJ-MM-TT hh:mm`. **Ausnahme Spalte A (`Name`): UTC-Datum** (Kompatibilität mit Transkript-Dateinamen).
- **Listen in einer Zelle** (Tags, Playlists, Suchbegriffe, Länder …) mit `; ` bzw. ` | ` trennen.
- **Lange Texte** (Beschreibung, Kommentare) auf max. 45.000 Zeichen kürzen (Zellgrenze 50.000).
- Formeln/Texte, die mit `=`, `+`, `-` beginnen könnten (z. B. Titel), bei USER_ENTERED absichern (führendes `'`), außer der gewollten `=IMAGE()`-Formel.
- **Shorts-Link:** bei Format „Short“ `https://www.youtube.com/shorts/<ID>`, sonst `https://www.youtube.com/watch?v=<ID>`.
- **Manuelle Spalten** (`Info-Karten Ziele`, `Endbildschirm Ziele`) in der Spaltenzuordnung des Sheets-Nodes **nicht** mappen, damit sie bei Updates erhalten bleiben. **Von Claude Code verifizieren**, dass „Append or Update Row“ nicht gemappte Spalten unverändert lässt.

---

## 6. Spalten des Blatts `Videos` (in dieser Reihenfolge)

Quellen: **Data API v3** = YouTube Data API v3 · **Analytics API** = YouTube Analytics API v2 · **Studio-Export** = Google Sheet aus 3.3 · **abgeleitet** = im Code-Node berechnet · **manuell** = trägt Jochen von Hand ein (aus YouTube Studio).

Die Kopfzeile liegt zusätzlich als Datei `youtube-analyse-kopfzeile.tsv` bei.

| Sp. | Gruppe | Spaltenname | Quelle | Feld / Abfrage | Hinweis |
|---|---|---|---|---|---|
| A | Stammdaten | Name | abgeleitet | UTC-Datum aus snippet.publishedAt (JJJJ-MM-TT) + '-' + Titel (/ und \ → -) + '-TS' | Schlüssel zu den Transkript-Dateien; exakt gleiche Regel wie im Transkript-Workflow |
| B | Stammdaten | Video-ID | Data API v3 | videos.list → id | Abgleichsspalte für Update |
| C | Stammdaten | Titel | Data API v3 | snippet.title |  |
| D | Stammdaten | YouTube-Link | abgeleitet | https://www.youtube.com/watch?v=ID bzw. https://www.youtube.com/shorts/ID |  |
| E | Stammdaten | Format (Short/Long) | Analytics API | dimensions=creatorContentType, metrics=views | SHORTS → Short, VIDEO_ON_DEMAND → Long; Fallback: Dauer ≤ 180 s = Short |
| F | Stammdaten | Veröffentlicht am | Data API v3 | snippet.publishedAt | Anzeige in Europe/Berlin, Format JJJJ-MM-TT hh:mm |
| G | Stammdaten | Wochentag | abgeleitet | aus Veröffentlichungsdatum (Europe/Berlin) |  |
| H | Stammdaten | Uhrzeit | abgeleitet | aus Veröffentlichungsdatum (Europe/Berlin) | hh:mm |
| I | Stammdaten | Alter (Tage) | abgeleitet | heute − Veröffentlichung |  |
| J | Stammdaten | Dauer (hh:mm:ss) | Data API v3 | contentDetails.duration | ISO 8601 (PT12M3S) umrechnen |
| K | Stammdaten | Dauer (Sek.) | abgeleitet | aus contentDetails.duration |  |
| L | Stammdaten | Sichtbarkeit | Data API v3 | status.privacyStatus | nur 'public' wird verarbeitet |
| M | Stammdaten | Playlists | Data API v3 | playlists.list(mine=true) + playlistItems.list | Playlist-Titel, mit ' \| ' getrennt |
| N | Reichweite | Aufrufe Lifetime | Analytics API | metrics=views (Zeitraum: Veröffentlichung bis heute) | Abgleich: statistics.viewCount (Data API) |
| O | Reichweite | Impressionen Lifetime | Studio-Export | Spalte 'Impressionen' |  |
| P | Reichweite | CTR Impressionen % | Studio-Export | Spalte 'Klickrate der Impressionen (%)' |  |
| Q | Reichweite | Klicks aus Impressionen | abgeleitet | Impressionen × CTR / 100 |  |
| R | Wiedergabezeit | Wiedergabezeit Std. 3 Mon. | Analytics API | metrics=estimatedMinutesWatched, startDate=heute−3 Mon. | ÷ 60, 1 Nachkommastelle |
| S | Wiedergabezeit | Wiedergabezeit Std. 6 Mon. | Analytics API | wie oben, heute−6 Mon. |  |
| T | Wiedergabezeit | Wiedergabezeit Std. 12 Mon. | Analytics API | wie oben, heute−12 Mon. |  |
| U | Wiedergabezeit | Wiedergabezeit Std. Lifetime | Analytics API | wie oben, ab Veröffentlichung |  |
| V | Wiedergabezeit | Aufrufe 3 Mon. | Analytics API | metrics=views, heute−3 Mon. |  |
| W | Wiedergabezeit | Aufrufe 6 Mon. | Analytics API | metrics=views, heute−6 Mon. |  |
| X | Wiedergabezeit | Aufrufe 12 Mon. | Analytics API | metrics=views, heute−12 Mon. |  |
| Y | Zuschauerbindung | Ø Wiedergabedauer (mm:ss) | Analytics API | metrics=averageViewDuration | Sekunden → mm:ss |
| Z | Zuschauerbindung | Ø angesehen % | Analytics API | metrics=averageViewPercentage | Zuschauerbindung in % |
| AA | Zuschauerbindung | Bindung bei 25 % | Analytics API | dimensions=elapsedVideoTimeRatio, metrics=audienceWatchRatio | Wert am Punkt 0,25 der Kurve, in % |
| AB | Zuschauerbindung | Bindung bei 50 % | Analytics API | wie oben, Punkt 0,50 |  |
| AC | Zuschauerbindung | Bindung bei 75 % | Analytics API | wie oben, Punkt 0,75 |  |
| AD | Zuschauerbindung | Bindung am Ende | Analytics API | wie oben, Punkt 1,00 |  |
| AE | Zuschauerbindung | Relative Bindung | Analytics API | metrics=relativeRetentionPerformance (Mittelwert der Kurve) | 0,5 = Durchschnitt vergleichbarer Videos |
| AF | Zuschauerbindung | Stärkster Abfall bei | abgeleitet | aus der Bindungskurve: größte Differenz zwischen zwei Punkten | als mm:ss im Video |
| AG | Interaktion | Likes | Analytics API | metrics=likes |  |
| AH | Interaktion | Kommentare | Analytics API | metrics=comments |  |
| AI | Interaktion | Shares | Analytics API | metrics=shares |  |
| AJ | Interaktion | Engagement-Rate % | abgeleitet | (Likes + Kommentare + Shares) / Aufrufe × 100 |  |
| AK | Abonnenten | Abos gewonnen | Analytics API | metrics=subscribersGained |  |
| AL | Abonnenten | Abos verloren | Analytics API | metrics=subscribersLost |  |
| AM | Abonnenten | Abos netto | abgeleitet | gewonnen − verloren |  |
| AN | Abonnenten | Aufrufe von Abonnenten % | Analytics API | dimensions=subscribedStatus, metrics=views | Anteil SUBSCRIBED |
| AO | Zugriffsquellen | Quelle YouTube-Suche % | Analytics API | dimensions=insightTrafficSourceType, metrics=views → YT_SEARCH | Anteil an allen Aufrufen (Lifetime) |
| AP | Zugriffsquellen | Quelle Vorgeschlagene Videos % | Analytics API | → RELATED_VIDEO |  |
| AQ | Zugriffsquellen | Quelle Startseite/Browse % | Analytics API | → SUBSCRIBER |  |
| AR | Zugriffsquellen | Quelle Shorts-Feed % | Analytics API | → SHORTS |  |
| AS | Zugriffsquellen | Quelle Kanalseite % | Analytics API | → YT_CHANNEL |  |
| AT | Zugriffsquellen | Quelle Playlists % | Analytics API | → PLAYLIST + YT_PLAYLIST_PAGE |  |
| AU | Zugriffsquellen | Quelle Extern % | Analytics API | → EXT_URL |  |
| AV | Zugriffsquellen | Quelle Endbildschirme % | Analytics API | → END_SCREEN | nur falls die API den Wert liefert |
| AW | Zugriffsquellen | Quelle Direkt/Unbekannt % | Analytics API | → NO_LINK_OTHER |  |
| AX | Zugriffsquellen | Quelle Sonstige % | abgeleitet | 100 − Summe der obigen |  |
| AY | Zugriffsquellen | Top externe Quellen | Analytics API | dimensions=insightTrafficSourceDetail, filter insightTrafficSourceType==EXT_URL, sort=-views, maxResults=10 | z. B. gicht-lotse.de (12); … |
| AZ | Suchbegriffe | Top-10 Suchbegriffe | Analytics API | dimensions=insightTrafficSourceDetail, filter insightTrafficSourceType==YT_SEARCH, sort=-views, maxResults=10 | Format: 'begriff (Aufrufe); …' |
| BA | Info-Karten | Hat Info-Karten | abgeleitet | Karten-Teaser-Impressionen > 0 | Ja/Nein |
| BB | Info-Karten | Karten-Impressionen | Analytics API | metrics=cardImpressions |  |
| BC | Info-Karten | Karten-Klicks | Analytics API | metrics=cardClicks |  |
| BD | Info-Karten | Karten-Klickrate % | Analytics API | metrics=cardClickRate |  |
| BE | Info-Karten | Karten-Teaser-Impressionen | Analytics API | metrics=cardTeaserImpressions |  |
| BF | Info-Karten | Karten-Teaser-Klicks | Analytics API | metrics=cardTeaserClicks |  |
| BG | Info-Karten | Info-Karten Ziele | manuell | aus YouTube Studio abschreiben | wird von n8n nie überschrieben |
| BH | Endbildschirm | Endbildschirm-Impressionen | Studio-Export | Spalte 'Endbildschirm-Elementimpressionen' | falls im Export enthalten |
| BI | Endbildschirm | Endbildschirm-Klicks | Studio-Export | Spalte 'Endbildschirm-Elementklicks' |  |
| BJ | Endbildschirm | Endbildschirm-Klickrate % | Studio-Export | Spalte 'Klickrate der Endbildschirm-Elemente (%)' |  |
| BK | Endbildschirm | Endbildschirm Ziele | manuell | aus YouTube Studio abschreiben | wird von n8n nie überschrieben |
| BL | Zuschauer | Anteil weiblich % | Analytics API | dimensions=gender, metrics=viewerPercentage | bei wenigen Aufrufen oft leer (Datenschutz-Schwelle) |
| BM | Zuschauer | Anteil männlich % | Analytics API | wie oben |  |
| BN | Zuschauer | Top-Altersgruppe | Analytics API | dimensions=ageGroup, metrics=viewerPercentage | z. B. 'age55-64 (34 %)' |
| BO | Zuschauer | Top-3 Länder | Analytics API | dimensions=country, metrics=views, sort=-views, maxResults=3 | z. B. 'DE 82 %; AT 9 %; CH 6 %' |
| BP | Zuschauer | Anteil Mobil % | Analytics API | dimensions=deviceType, metrics=views → MOBILE |  |
| BQ | Zuschauer | Anteil Desktop % | Analytics API | → DESKTOP |  |
| BR | Zuschauer | Anteil TV % | Analytics API | → TV |  |
| BS | Zuschauer | Anteil Tablet % | Analytics API | → TABLET |  |
| BT | Inhalt | Titel-Länge (Zeichen) | abgeleitet | Länge von snippet.title |  |
| BU | Inhalt | Beschreibung | Data API v3 | snippet.description |  |
| BV | Inhalt | Beschreibung-Länge (Zeichen) | abgeleitet |  |  |
| BW | Inhalt | Links in Beschreibung | abgeleitet | URLs aus snippet.description | Domains, mit ' \| ' getrennt |
| BX | Inhalt | Hashtags | abgeleitet | #Wörter aus Beschreibung/Titel |  |
| BY | Inhalt | Kapitel (Anzahl) | abgeleitet | Zeilen in der Beschreibung, die mit Zeitmarke beginnen (0:00 …) | 0 = keine Kapitel |
| BZ | Inhalt | Tags | Data API v3 | snippet.tags | mit ', ' getrennt |
| CA | Inhalt | Anzahl Tags | abgeleitet |  |  |
| CB | Inhalt | Kategorie | Data API v3 | snippet.categoryId → videoCategories.list (hl=de) | Name statt Nummer |
| CC | Inhalt | Audio-Sprache | Data API v3 | snippet.defaultAudioLanguage |  |
| CD | Inhalt | Untertitel vorhanden | Data API v3 | contentDetails.caption | true/false → Ja/Nein |
| CE | Inhalt | Für Kinder | Data API v3 | status.madeForKids |  |
| CF | Kommentare | Anzahl Kommentare | Data API v3 | statistics.commentCount |  |
| CG | Kommentare | Kommentare ohne Antwort | Data API v3 | commentThreads.list → snippet.totalReplyCount == 0 | Anzahl Threads ohne Antwort |
| CH | Kommentare | Kommentare mit Frage | abgeleitet | Top-Level-Kommentare, die '?' enthalten |  |
| CI | Kommentare | Kommentartexte | Data API v3 | commentThreads.list (part=snippet, textFormat=plainText, order=time, max. 200) | 'Datum: Text' mit ' \|\|\| ' getrennt, auf 45.000 Zeichen kürzen |
| CJ | Thumbnail | Thumbnail-URL | Data API v3 | snippet.thumbnails.maxres → standard → high | beste verfügbare Größe |
| CK | Thumbnail | Thumbnail | abgeleitet | =IMAGE("https://i.ytimg.com/vi/<ID>/default.jpg") | kleine Vorschau 120×90 direkt in der Zelle; als USER_ENTERED schreiben |
| CL | Thumbnail | Thumbnail-Datei (Drive) | abgeleitet | Upload von https://i.ytimg.com/vi/<ID>/mqdefault.jpg (320×180) nach Drive-Ordner 'Thumbnails', Dateiname = Name + '.jpg' | Link zur Datei in Drive; physische Kopie |
| CM | Meta | Abgerufen am | abgeleitet | Zeitpunkt des Laufs (Europe/Berlin) |  |

### Nicht über APIs verfügbar

- **Welches Video im Endbildschirm verlinkt ist** und **wohin Info-Karten führen**: keine Google-API liefert die Konfiguration → Spalten `Endbildschirm Ziele` und `Info-Karten Ziele` pflegt Jochen manuell aus YouTube Studio.
- **CTR/Impressionen** über die Analytics API: nicht verfügbar → Studio-Export.

---

## 7. Testplan

1. Credential „Google YouTube“ verbinden → Node `Kanal holen` einzeln ausführen → muss den Kanal *jochenhein-gicht-lotse* liefern.
2. `max_videos = 3` → kompletter Lauf → 3 Zeilen im Blatt `Videos`, 3 JPGs im Ordner `Thumbnails`.
3. Werte stichprobenartig mit YouTube Studio vergleichen (Aufrufe, Wiedergabezeit Lifetime, Ø angesehen %, CTR).
4. Spalte A gegen die Transkript-Dateinamen im Drive-Ordner „Gicht-Kompass“ prüfen (identische Schreibweise).
5. Lauf wiederholen → **keine Dubletten**, Werte aktualisiert, manuelle Spalten unverändert.
6. `max_videos = 0` → alle öffentlichen Videos.

---

## 8. Offene Punkte für Claude Code

- Tabellenblatt-Namen und genaue Spaltennamen im Studio-Export prüfen (Sheet 3.3) und Zuordnung tolerant implementieren.
- Zulässigkeit aller Analytics-Abfragen (4.3) gegen die Doku prüfen; Abweichungen dokumentieren.
- Verhalten von „Append or Update Row“ bei nicht gemappten Spalten verifizieren.
- Liefert der Workflow als importierbare n8n-JSON-Datei inkl. Sticky-Note mit Kurzanleitung; Credentials bleiben leer (werden nach Import zugewiesen).
- Nach Import erfahrungsgemäß prüfen: *Generic Auth Type*, *Operation* der Google-Nodes und Expression-Felder (gehen beim Import gelegentlich verloren).

---

## Quellen (API-Dokumentation)

- YouTube Data API v3 – Referenz: https://developers.google.com/youtube/v3/docs
- YouTube Analytics API – Channel Reports: https://developers.google.com/youtube/analytics/channel_reports
- YouTube Analytics API – Dimensions: https://developers.google.com/youtube/analytics/dimensions
- YouTube Analytics API – Metrics: https://developers.google.com/youtube/analytics/metrics
