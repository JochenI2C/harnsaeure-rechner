#!/usr/bin/env python3
"""Erzeugt youtube-analyse-workflow.json (n8n-Import) aus den Code-Node-Skripten in src/.

Aufruf:  python3 build_workflow.py
"""
import json
import uuid
from pathlib import Path

HIER = Path(__file__).parent
SRC = HIER / "src"
KOPFZEILE = (HIER / "youtube-analyse-kopfzeile.tsv").read_text(encoding="utf-8").splitlines()[0].split("\t")

YT = "https://www.googleapis.com/youtube/v3/"
CFG = "$('Konfiguration').first().json"

# Credential-Namen wie in n8n angelegt; n8n ordnet sie beim Import über den Namen zu
# Generische OAuth2-Credential, weil nur dort prompt=select_account gesetzt werden kann (Brand-Konto auswählbar)
CRED_YOUTUBE = {"oAuth2Api": {"id": "", "name": "YouTube Gicht-Lotse (Brand)"}}
CRED_SHEETS = {"googleSheetsOAuth2Api": {"id": "", "name": "Google Sheets account"}}
CRED_DRIVE = {"googleDriveOAuth2Api": {"id": "", "name": "johein1503@gmail.com - OAuth2 API"}}

nodes = []
connections = {}


def nid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "youtube-analyse/" + name))


def node(name, typ, version, pos, params, **extra):
    if "credentials" not in extra:
        if typ == "n8n-nodes-base.googleSheets":
            extra["credentials"] = CRED_SHEETS
        elif typ == "n8n-nodes-base.googleDrive":
            extra["credentials"] = CRED_DRIVE
    n = {"parameters": params, "id": nid(name), "name": name, "type": typ,
         "typeVersion": version, "position": list(pos)}
    n.update(extra)
    nodes.append(n)
    return name


def verbinde(von, nach, ausgang=0):
    outs = connections.setdefault(von, {"main": []})["main"]
    while len(outs) <= ausgang:
        outs.append([])
    outs[ausgang].append({"node": nach, "type": "main", "index": 0})


def code(name, pos, datei, **extra):
    return node(name, "n8n-nodes-base.code", 2, pos,
                {"jsCode": (SRC / datei).read_text(encoding="utf-8")}, **extra)


def paginierung(max_seiten=None):
    p = {
        "paginationMode": "updateAParameterInEachRequest",
        "parameters": {"parameters": [
            {"type": "qs", "name": "pageToken", "value": "={{ $response.body.nextPageToken }}"}]},
        "paginationCompleteWhen": "other",
        "completeExpression": "={{ !$response.body.nextPageToken }}",
    }
    if max_seiten:
        p["limitPagesFetched"] = True
        p["maxRequests"] = max_seiten
    return {"pagination": p}


def youtube(name, pos, url, query=None, options=None, **extra):
    params = {
        "url": url,
        "authentication": "genericCredentialType",
        "genericAuthType": "oAuth2Api",
        "sendQuery": bool(query),
        "options": options or {},
    }
    if query:
        params["queryParameters"] = {"parameters": [{"name": k, "value": v} for k, v in query]}
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, params, credentials=CRED_YOUTUBE, **extra)


def rl_id(wert):
    return {"__rl": True, "value": wert, "mode": "id"}


def rl_name(wert):
    return {"__rl": True, "value": wert, "mode": "name"}


def sheets_schema(spalten):
    return [{"id": s, "displayName": s, "required": False, "defaultMatch": False, "display": True,
             "type": "string", "canBeUsedToMatch": True} for s in spalten]


# ---------------------------------------------------------------- Vorbereitung
X = 0
def p(dx=220):
    global X
    X += dx
    return (X, 300)

start = node("Start (manuell)", "n8n-nodes-base.manualTrigger", 1, (0, 300), {})

konfig = [
    ("ziel_sheet_id", "1xNM0p9YcAvR0JXlWotfmhhvSLHB6H1is1Goyur-s_Ok", "string"),
    ("ziel_blatt", "Videos", "string"),
    ("studio_export_sheet_id", "1ZvIM94GocOg7WEkoRqyPzVvIJ1UNRax8BCjef_pCfIc", "string"),
    ("studio_export_blatt", "Tabellendaten", "string"),
    ("thumbnail_ordner_id", "1zDvPi1NVebYu12wLCPOWeQ0k9rczZ-Mv", "string"),
    ("max_videos", 3, "number"),
    ("zeitzone", "Europe/Berlin", "string"),
]
node("Konfiguration", "n8n-nodes-base.set", 3.4, p(), {
    "assignments": {"assignments": [
        {"id": nid("cfg/" + k), "name": k, "value": v, "type": t} for k, v, t in konfig]},
    "options": {},
})

youtube("Kanal holen", p(), YT + "channels",
        [("part", "id,snippet,contentDetails"), ("mine", "true")])

youtube("Upload-Playlist lesen", p(), YT + "playlistItems",
        [("part", "contentDetails"),
         ("playlistId", "={{ $json.items[0].contentDetails.relatedPlaylists.uploads }}"),
         ("maxResults", "50")],
        {"pagination": paginierung()})

code("Video-ID-Gruppen", p(), "video-id-gruppen.js")

youtube("Video-Details", p(), YT + "videos",
        [("part", "snippet,contentDetails,statistics,status"), ("id", "={{ $json.ids }}"),
         ("maxResults", "50")])

code("Nur öffentliche Videos", p(), "nur-oeffentliche-videos.js")

youtube("Kategorien holen", p(), YT + "videoCategories",
        [("part", "snippet"), ("regionCode", "DE"), ("hl", "de")],
        executeOnce=True, onError="continueRegularOutput", alwaysOutputData=True)

node("Studio-Export lesen", "n8n-nodes-base.googleSheets", 4.5, p(), {
    "resource": "sheet",
    "operation": "read",
    "documentId": rl_id(f"={{{{ {CFG}.studio_export_sheet_id }}}}"),
    "sheetName": rl_name(f"={{{{ {CFG}.studio_export_blatt }}}}"),
    "options": {},
}, executeOnce=True, onError="continueRegularOutput", alwaysOutputData=True)

code("Daten vorbereiten", p(), "daten-vorbereiten.js")

loop = node("Loop über Videos", "n8n-nodes-base.splitInBatches", 3, p(), {"options": {}})
LOOP_X = X

# ---------------------------------------------------------------- Schleife (zweite Reihe)
X = LOOP_X - 220
def q(dx=220):
    global X
    X += dx
    return (X, 560)

code("Analytics-Abfragen erzeugen", q(), "analytics-abfragen-erzeugen.js")

node("Analytics abrufen", "n8n-nodes-base.httpRequest", 4.2, q(), {
    "url": "={{ $json.url }}",
    "authentication": "genericCredentialType",
    "genericAuthType": "oAuth2Api",
    "options": {"batching": {"batch": {"batchSize": 4, "batchInterval": 300}}},
}, credentials=CRED_YOUTUBE, onError="continueRegularOutput", alwaysOutputData=True)

youtube("Kommentare abrufen", q(), YT + "commentThreads",
        [("part", "snippet"),
         ("videoId", "={{ $('Analytics-Abfragen erzeugen').first().json.ctx.video.id }}"),
         ("maxResults", "100"), ("order", "time"), ("textFormat", "plainText")],
        {"pagination": paginierung(max_seiten=2)},
        executeOnce=True, onError="continueRegularOutput", alwaysOutputData=True)

code("Zeile zusammenbauen", q(), "zeile-zusammenbauen.js")

node("Thumbnail suchen", "n8n-nodes-base.googleDrive", 3, q(), {
    "resource": "fileFolder",
    "searchMethod": "query",
    "queryString": "={{ $json.drive.query }}",
    "limit": 1,
    "filter": {},
    "options": {"fields": ["id", "name", "webViewLink"]},
}, onError="continueRegularOutput", alwaysOutputData=True)

node("Thumbnail laden", "n8n-nodes-base.httpRequest", 4.2, q(), {
    "url": "=https://i.ytimg.com/vi/{{ $('Zeile zusammenbauen').first().json.zeile['Video-ID'] }}/mqdefault.jpg",
    "options": {"response": {"response": {"responseFormat": "file", "outputPropertyName": "data"}}},
}, executeOnce=True, onError="continueRegularOutput", alwaysOutputData=True)

node("Thumbnail vorhanden?", "n8n-nodes-base.if", 2, q(), {
    "conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
        "conditions": [{
            "id": nid("if/thumb"),
            "leftValue": "={{ String($('Thumbnail suchen').first().json.id ?? '') }}",
            "rightValue": "",
            "operator": {"type": "string", "operation": "notEmpty", "singleValue": True},
        }],
        "combinator": "and",
    },
    "options": {},
})
IF_X = X

node("Thumbnail ersetzen", "n8n-nodes-base.googleDrive", 3, (IF_X + 220, 460), {
    "resource": "file",
    "operation": "update",
    "fileId": rl_id("={{ $('Thumbnail suchen').first().json.id }}"),
    "changeFileContent": True,
    "inputDataFieldName": "data",
    "updateFields": {},
}, onError="continueRegularOutput", alwaysOutputData=True)

node("Thumbnail hochladen", "n8n-nodes-base.googleDrive", 3, (IF_X + 220, 660), {
    "resource": "file",
    "operation": "upload",
    "name": "={{ $('Zeile zusammenbauen').first().json.drive.dateiname }}",
    "driveId": {"__rl": True, "value": "My Drive", "mode": "list", "cachedResultName": "My Drive"},
    "folderId": rl_id(f"={{{{ {CFG}.thumbnail_ordner_id }}}}"),
    "inputDataFieldName": "data",
    "options": {},
}, onError="continueRegularOutput", alwaysOutputData=True)

X = IF_X + 220
code("Zeile fertigstellen", q(), "zeile-fertigstellen.js")

# Das Schema muss alle Spalten des Blatts in derselben Reihenfolge enthalten, sonst bricht der
# Sheets-Node mit "Column names were updated after the node's setup" ab. Geschrieben werden bei
# "Map Automatically" trotzdem nur die Felder des Input-Items.
node("Zeile schreiben", "n8n-nodes-base.googleSheets", 4.5, q(), {
    "resource": "sheet",
    "operation": "appendOrUpdate",
    "documentId": rl_id(f"={{{{ {CFG}.ziel_sheet_id }}}}"),
    "sheetName": rl_name(f"={{{{ {CFG}.ziel_blatt }}}}"),
    "columns": {
        "mappingMode": "autoMapInputData",
        "value": {},
        "matchingColumns": ["Video-ID"],
        "schema": sheets_schema(KOPFZEILE),
    },
    "options": {"cellFormat": "RAW", "handlingExtraData": "ignoreIt"},
})

code("Thumbnail-Formel vorbereiten", q(), "thumbnail-formel-vorbereiten.js")

node("Thumbnail-Formel schreiben", "n8n-nodes-base.googleSheets", 4.5, q(), {
    "resource": "sheet",
    "operation": "update",
    "documentId": rl_id(f"={{{{ {CFG}.ziel_sheet_id }}}}"),
    "sheetName": rl_name(f"={{{{ {CFG}.ziel_blatt }}}}"),
    "columns": {
        "mappingMode": "autoMapInputData",
        "value": {},
        "matchingColumns": ["Video-ID"],
        "schema": sheets_schema(KOPFZEILE),
    },
    "options": {"cellFormat": "USER_ENTERED", "handlingExtraData": "ignoreIt"},
}, onError="continueRegularOutput")

node("Pause", "n8n-nodes-base.wait", 1.1, q(), {"amount": 1, "unit": "seconds"},
     webhookId=nid("wait-webhook"))

code("Fertig", (LOOP_X + 220, 300), "fertig.js")

# ---------------------------------------------------------------- Verbindungen
kette = ["Start (manuell)", "Konfiguration", "Kanal holen", "Upload-Playlist lesen", "Video-ID-Gruppen",
         "Video-Details", "Nur öffentliche Videos", "Kategorien holen", "Studio-Export lesen", "Daten vorbereiten",
         "Loop über Videos"]
for a, b in zip(kette, kette[1:]):
    verbinde(a, b)
verbinde("Loop über Videos", "Fertig", 0)
verbinde("Loop über Videos", "Analytics-Abfragen erzeugen", 1)
schleife = ["Analytics-Abfragen erzeugen", "Analytics abrufen", "Kommentare abrufen", "Zeile zusammenbauen",
            "Thumbnail suchen", "Thumbnail laden", "Thumbnail vorhanden?"]
for a, b in zip(schleife, schleife[1:]):
    verbinde(a, b)
verbinde("Thumbnail vorhanden?", "Thumbnail ersetzen", 0)
verbinde("Thumbnail vorhanden?", "Thumbnail hochladen", 1)
verbinde("Thumbnail ersetzen", "Zeile fertigstellen")
verbinde("Thumbnail hochladen", "Zeile fertigstellen")
schluss = ["Zeile fertigstellen", "Zeile schreiben", "Thumbnail-Formel vorbereiten",
           "Thumbnail-Formel schreiben", "Pause", "Loop über Videos"]
for a, b in zip(schluss, schluss[1:]):
    verbinde(a, b)

# ---------------------------------------------------------------- Sticky-Note
anleitung = """## YouTube-Kanalanalyse → Google Sheet

**Vor dem ersten Lauf**
1. Node **Konfiguration**: Ziel-Sheet und Thumbnail-Ordner sind eingetragen. `studio_export_blatt` prüfen (Standard „Tabellendaten“). `max_videos` = 3 zum Testen, 0 = alle.
2. Credentials prüfen (sind über den Namen vorbelegt):
   • alle HTTP-Nodes zu YouTube: **OAuth2 API** (Generic) „YouTube Gicht-Lotse (Brand)“
   • Google-Sheets-Nodes: „Google Sheets account“
   • Google-Drive-Nodes: „johein1503@gmail.com - OAuth2 API“
   • „Thumbnail laden“ braucht **keine** Credential.
3. Nach dem Import prüfen: Authentication = *Generic Credential Type → OAuth2 API*, Operationen der Google-Nodes, Expression-Felder.

**Test:** zuerst nur „Kanal holen“ ausführen → muss den Gicht-Lotse-Kanal liefern.

**Hinweise**
• Spalten „Info-Karten Ziele“, „Endbildschirm Ziele“ und „Playlists“ werden nie geschrieben.
• Hauptzeile wird RAW geschrieben, die Spalte „Thumbnail“ (=IMAGE) separat mit USER_ENTERED.
• Fehlerhafte Analytics-Abfragen lassen nur die betroffene Spalte leer.
• Details: README.md im Repo-Ordner n8n/youtube-analyse."""
nodes.append({"parameters": {"content": anleitung, "height": 620, "width": 560, "color": 4},
              "id": nid("sticky"), "name": "Kurzanleitung", "type": "n8n-nodes-base.stickyNote",
              "typeVersion": 1, "position": [-40, -380]})

workflow = {
    "name": "YouTube-Analyse Gicht-Lotse",
    "nodes": nodes,
    "connections": connections,
    "pinData": {},
    "settings": {"executionOrder": "v1"},
    "meta": {"templateCredsSetupCompleted": False},
    "tags": [],
}

ziel = HIER / "youtube-analyse-workflow.json"
ziel.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{ziel.name}: {len(nodes)} Nodes geschrieben")
