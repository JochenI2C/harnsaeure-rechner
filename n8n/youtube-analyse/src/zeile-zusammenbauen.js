// Alle Ergebnisse eines Videos zu einer Zeile mit den Spalten des Blatts "Videos" zusammenführen
const cfg = $('Konfiguration').first().json;
const tz = cfg.zeitzone || 'Europe/Berlin';
const anfragen = $('Analytics-Abfragen erzeugen').all();
const antworten = $('Analytics abrufen').all();
const ctx = anfragen[0].json.ctx;
const v = ctx.video;
const sn = v.snippet || {};
const cd = v.contentDetails || {};
const st = v.statistics || {};
const status = v.status || {};
const studio = ctx.studio || {};
const id = v.id;

// --- Hilfsfunktionen ---
const leer = '';
const r = (x, d = 1) => (typeof x === 'number' && isFinite(x)) ? Math.round(x * 10 ** d) / 10 ** d : leer;
const zahl = x => (x === undefined || x === null || x === '' || !isFinite(Number(x))) ? leer : Number(x);
const istZahl = x => typeof x === 'number' && isFinite(x);
const mmss = s => {
  if (!istZahl(s)) return leer;
  s = Math.round(s);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
const hhmmss = s => {
  if (!istZahl(s)) return leer;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sek = s % 60;
  return [h, m, sek].map(x => String(x).padStart(2, '0')).join(':');
};
const kuerzen = (t, n = 45000) => t.length > n ? t.slice(0, n - 1) + '…' : t;
const janein = b => (b === undefined || b === null || b === '') ? leer : ((b === true || b === 'true') ? 'Ja' : 'Nein');

// --- Analytics-Antworten per key zuordnen (fehlerhafte Abfragen bleiben undefined -> Spalte leer) ---
const A = {};
antworten.forEach((item, i) => {
  let p = item.pairedItem;
  if (Array.isArray(p)) p = p[0];
  const req = anfragen[(p && typeof p.item === 'number') ? p.item : i];
  const b = item.json;
  if (req && b && !b.error && Array.isArray(b.columnHeaders)) {
    const kopf = b.columnHeaders.map(h => h.name);
    A[req.json.key] = (b.rows || []).map(row => Object.fromEntries(kopf.map((k, j) => [k, row[j]])));
  }
});
// Kennzahl aus einer Abfrage ohne dimensions; Abfrage ok, aber keine Zeilen -> 0
const wert = (key, metrik) => {
  const rows = A[key];
  if (!rows) return leer;
  if (!rows.length) return 0;
  return zahl(rows[0][metrik]);
};
// Anteile in % je Dimensionswert
const anteile = (key, dim, metrik) => {
  const rows = A[key];
  if (!rows || !rows.length) return null;
  const m = {};
  let summe = 0;
  for (const row of rows) {
    const n = Number(row[metrik]) || 0;
    m[row[dim]] = (m[row[dim]] || 0) + n;
    summe += n;
  }
  if (summe <= 0) return null;
  for (const k in m) m[k] = m[k] / summe * 100;
  return m;
};
const pct = (m, ...keys) => m ? r(keys.reduce((s, k) => s + (m[k] || 0), 0), 1) : leer;
const std = min => istZahl(min) ? r(min / 60, 1) : leer;

// --- Stammdaten ---
const titel = sn.title || '';
const pubUtc = DateTime.fromISO(sn.publishedAt, { zone: 'utc' });
const pubLokal = pubUtc.setZone(tz).setLocale('de');
const jetzt = DateTime.now().setZone(tz);
const name = pubUtc.toFormat('yyyy-MM-dd') + '-' + titel.trim().replace(/[\/\\]/g, '-') + '-TS';

const iso = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(cd.duration || '');
const dauerSek = iso ? (+(iso[1] || 0)) * 86400 + (+(iso[2] || 0)) * 3600 + (+(iso[3] || 0)) * 60 + (+(iso[4] || 0)) : leer;

let format = leer;
const formate = anteile('format', 'creatorContentType', 'views');
if (formate) {
  const top = Object.entries(formate).sort((a, b) => b[1] - a[1])[0][0];
  if (top === 'SHORTS') format = 'Short';
  else if (top === 'VIDEO_ON_DEMAND') format = 'Long';
}
if (!format && istZahl(dauerSek)) format = dauerSek <= 180 ? 'Short' : 'Long';

// --- Reichweite / Wiedergabezeit / Interaktion ---
let aufrufe = wert('basis', 'views');
if (!istZahl(aufrufe)) aufrufe = zahl(st.viewCount);
const impressionen = studio.impressionen ?? leer;
const ctr = studio.ctr ?? leer;
let likes = wert('basis', 'likes');
if (!istZahl(likes)) likes = zahl(st.likeCount);
let kommentare = wert('basis', 'comments');
if (!istZahl(kommentare)) kommentare = zahl(st.commentCount);
const shares = wert('basis', 'shares');
const engagement = (istZahl(aufrufe) && aufrufe > 0 && istZahl(likes) && istZahl(kommentare) && istZahl(shares))
  ? r((likes + kommentare + shares) / aufrufe * 100, 2) : leer;
const abosPlus = wert('basis', 'subscribersGained');
const abosMinus = wert('basis', 'subscribersLost');

// --- Bindungskurve ---
const kurve = (A.bindung || [])
  .map(x => ({ t: Number(x.elapsedVideoTimeRatio), w: Number(x.audienceWatchRatio), rel: Number(x.relativeRetentionPerformance) }))
  .filter(p => isFinite(p.t) && isFinite(p.w))
  .sort((a, b) => a.t - b.t);
const bindungBei = t => {
  if (!kurve.length) return leer;
  let best = kurve[0];
  for (const p of kurve) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return r(best.w * 100, 1);
};
const relWerte = kurve.map(p => p.rel).filter(x => isFinite(x));
const relBindung = relWerte.length ? r(relWerte.reduce((s, x) => s + x, 0) / relWerte.length, 2) : leer;
let staerksterAbfall = leer;
if (kurve.length > 1 && istZahl(dauerSek)) {
  let max = 0, bei = null;
  for (let i = 1; i < kurve.length; i++) {
    const d = kurve[i - 1].w - kurve[i].w;
    if (d > max) { max = d; bei = kurve[i].t; }
  }
  if (bei !== null) staerksterAbfall = mmss(bei * dauerSek);
}

// --- Zugriffsquellen ---
const q = anteile('quellen', 'insightTrafficSourceType', 'views');
const bekannt = ['YT_SEARCH', 'RELATED_VIDEO', 'SUBSCRIBER', 'SHORTS', 'YT_CHANNEL', 'PLAYLIST', 'YT_PLAYLIST_PAGE', 'EXT_URL', 'END_SCREEN', 'NO_LINK_OTHER'];
const sonstige = q ? r(Math.max(0, 100 - bekannt.reduce((s, k) => s + (q[k] || 0), 0)), 1) : leer;
const topListe = key => A[key]
  ? A[key].slice(0, 10).map(x => `${x.insightTrafficSourceDetail} (${x.views})`).join('; ')
  : leer;

// --- Info-Karten ---
const kImpr = wert('karten', 'cardImpressions');
const kKlicks = wert('karten', 'cardClicks');
const kTImpr = wert('karten', 'cardTeaserImpressions');
const kTKlicks = wert('karten', 'cardTeaserClicks');
const kRate = istZahl(kImpr) ? (kImpr > 0 && istZahl(kKlicks) ? r(kKlicks / kImpr * 100, 2) : 0) : leer;
const hatKarten = istZahl(kTImpr) ? ((kTImpr > 0 || kImpr > 0) ? 'Ja' : 'Nein') : leer;

// --- Zuschauer ---
let weiblich = leer, maennlich = leer, topAlter = leer;
if (A.demografie && A.demografie.length) {
  const g = {}, a = {};
  for (const x of A.demografie) {
    const p = Number(x.viewerPercentage) || 0;
    g[x.gender] = (g[x.gender] || 0) + p;
    a[x.ageGroup] = (a[x.ageGroup] || 0) + p;
  }
  weiblich = r(g.female || 0, 1);
  maennlich = r(g.male || 0, 1);
  const top = Object.entries(a).sort((x, y) => y[1] - x[1])[0];
  topAlter = `${top[0]} (${Math.round(top[1])} %)`;
}
const laender = anteile('laender', 'country', 'views');
const top3Laender = laender
  ? Object.entries(laender).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, p]) => `${k} ${Math.round(p)} %`).join('; ')
  : leer;
const geraete = anteile('geraete', 'deviceType', 'views');
const abostatus = anteile('abostatus', 'subscribedStatus', 'views');

// --- Inhalt ---
const beschreibung = sn.description || '';
const urls = beschreibung.match(/https?:\/\/[^\s<>"'()\[\]]+/gi) || [];
const domains = [];
for (const u of urls) {
  try {
    const host = new URL(u).hostname.replace(/^www\./, '');
    if (!domains.includes(host)) domains.push(host);
  } catch (e) { /* ungültige URL ignorieren */ }
}
const ohneUrls = (titel + ' ' + beschreibung).replace(/https?:\/\/\S+/gi, ' ');
const hashtags = [...new Set(ohneUrls.match(/#[\p{L}\p{N}_]+/gu) || [])];
const kapitel = beschreibung.split(/\r?\n/)
  .filter(z => /^\s*[-•▶►]?\s*\(?\d{1,2}:\d{2}(?::\d{2})?\)?(\s|$)/.test(z)).length;
const tags = sn.tags || [];

// --- Kommentare (max. 200 Threads) ---
const kommentarSeiten = $('Kommentare abrufen').all();
const kommentareOk = kommentarSeiten.some(s => Array.isArray(s.json.items));
const threads = kommentarSeiten.flatMap(s => s.json.items || []).slice(0, 200).map(t => ({
  s: (t.snippet && t.snippet.topLevelComment && t.snippet.topLevelComment.snippet) || {},
  antworten: (t.snippet && t.snippet.totalReplyCount) || 0,
}));
const kText = c => (c.s.textDisplay || c.s.textOriginal || '').replace(/\s+/g, ' ').trim();
const kommentartexte = kommentareOk
  ? kuerzen(threads.map(c => DateTime.fromISO(c.s.publishedAt).setZone(tz).toFormat('yyyy-MM-dd') + ': ' + kText(c)).join(' ||| '))
  : leer;

// --- Thumbnail ---
const th = sn.thumbnails || {};
const thumbnailUrl = (th.maxres || th.standard || th.high || th.medium || th.default || {}).url || leer;

// Zeile in Spaltenreihenfolge. Nicht enthalten (und daher nie überschrieben):
// "Info-Karten Ziele", "Endbildschirm Ziele" (manuell) und "Thumbnail" (eigener Schreib-Node, USER_ENTERED).
const zeile = {
  'Name': name,
  'Video-ID': id,
  'Titel': titel,
  'YouTube-Link': format === 'Short' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
  'Format (Short/Long)': format,
  'Veröffentlicht am': pubLokal.toFormat('yyyy-MM-dd HH:mm'),
  'Wochentag': pubLokal.toFormat('cccc'),
  'Uhrzeit': pubLokal.toFormat('HH:mm'),
  'Alter (Tage)': Math.floor(jetzt.diff(pubUtc, 'days').days),
  'Dauer (hh:mm:ss)': hhmmss(dauerSek),
  'Dauer (Sek.)': dauerSek,
  'Sichtbarkeit': status.privacyStatus || leer,
  'Playlists': ctx.playlists || leer,
  'Aufrufe Lifetime': aufrufe,
  'Impressionen Lifetime': impressionen,
  'CTR Impressionen %': istZahl(ctr) ? r(ctr, 2) : leer,
  'Klicks aus Impressionen': (istZahl(impressionen) && istZahl(ctr)) ? Math.round(impressionen * ctr / 100) : leer,
  'Wiedergabezeit Std. 3 Mon.': std(wert('wz_3m', 'estimatedMinutesWatched')),
  'Wiedergabezeit Std. 6 Mon.': std(wert('wz_6m', 'estimatedMinutesWatched')),
  'Wiedergabezeit Std. 12 Mon.': std(wert('wz_12m', 'estimatedMinutesWatched')),
  'Wiedergabezeit Std. Lifetime': std(wert('basis', 'estimatedMinutesWatched')),
  'Aufrufe 3 Mon.': wert('wz_3m', 'views'),
  'Aufrufe 6 Mon.': wert('wz_6m', 'views'),
  'Aufrufe 12 Mon.': wert('wz_12m', 'views'),
  'Ø Wiedergabedauer (mm:ss)': mmss(wert('basis', 'averageViewDuration')),
  'Ø angesehen %': r(wert('basis', 'averageViewPercentage'), 1),
  'Bindung bei 25 %': bindungBei(0.25),
  'Bindung bei 50 %': bindungBei(0.5),
  'Bindung bei 75 %': bindungBei(0.75),
  'Bindung am Ende': bindungBei(1),
  'Relative Bindung': relBindung,
  'Stärkster Abfall bei': staerksterAbfall,
  'Likes': likes,
  'Kommentare': kommentare,
  'Shares': shares,
  'Engagement-Rate %': engagement,
  'Abos gewonnen': abosPlus,
  'Abos verloren': abosMinus,
  'Abos netto': (istZahl(abosPlus) && istZahl(abosMinus)) ? abosPlus - abosMinus : leer,
  'Aufrufe von Abonnenten %': pct(abostatus, 'SUBSCRIBED'),
  'Quelle YouTube-Suche %': pct(q, 'YT_SEARCH'),
  'Quelle Vorgeschlagene Videos %': pct(q, 'RELATED_VIDEO'),
  'Quelle Startseite/Browse %': pct(q, 'SUBSCRIBER'),
  'Quelle Shorts-Feed %': pct(q, 'SHORTS'),
  'Quelle Kanalseite %': pct(q, 'YT_CHANNEL'),
  'Quelle Playlists %': pct(q, 'PLAYLIST', 'YT_PLAYLIST_PAGE'),
  'Quelle Extern %': pct(q, 'EXT_URL'),
  'Quelle Endbildschirme %': pct(q, 'END_SCREEN'),
  'Quelle Direkt/Unbekannt %': pct(q, 'NO_LINK_OTHER'),
  'Quelle Sonstige %': sonstige,
  'Top externe Quellen': topListe('extern'),
  'Top-10 Suchbegriffe': topListe('suche'),
  'Hat Info-Karten': hatKarten,
  'Karten-Impressionen': kImpr,
  'Karten-Klicks': kKlicks,
  'Karten-Klickrate %': kRate,
  'Karten-Teaser-Impressionen': kTImpr,
  'Karten-Teaser-Klicks': kTKlicks,
  'Endbildschirm-Impressionen': studio.endImpressionen ?? leer,
  'Endbildschirm-Klicks': studio.endKlicks ?? leer,
  'Endbildschirm-Klickrate %': istZahl(studio.endCtr) ? r(studio.endCtr, 2) : leer,
  'Anteil weiblich %': weiblich,
  'Anteil männlich %': maennlich,
  'Top-Altersgruppe': topAlter,
  'Top-3 Länder': top3Laender,
  'Anteil Mobil %': pct(geraete, 'MOBILE'),
  'Anteil Desktop %': pct(geraete, 'DESKTOP'),
  'Anteil TV %': pct(geraete, 'TV'),
  'Anteil Tablet %': pct(geraete, 'TABLET'),
  'Titel-Länge (Zeichen)': titel.length,
  'Beschreibung': kuerzen(beschreibung),
  'Beschreibung-Länge (Zeichen)': beschreibung.length,
  'Links in Beschreibung': domains.join(' | '),
  'Hashtags': hashtags.join('; '),
  'Kapitel (Anzahl)': kapitel,
  'Tags': tags.join(', '),
  'Anzahl Tags': tags.length,
  'Kategorie': ctx.kategorie || leer,
  'Audio-Sprache': sn.defaultAudioLanguage || leer,
  'Untertitel vorhanden': janein(cd.caption),
  'Für Kinder': janein(status.madeForKids),
  'Anzahl Kommentare': zahl(st.commentCount),
  'Kommentare ohne Antwort': kommentareOk ? threads.filter(c => c.antworten === 0).length : leer,
  'Kommentare mit Frage': kommentareOk ? threads.filter(c => kText(c).includes('?')).length : leer,
  'Kommentartexte': kommentartexte,
  'Thumbnail-URL': thumbnailUrl,
  'Thumbnail-Datei (Drive)': leer, // wird in "Zeile fertigstellen" gesetzt
  'Abgerufen am': jetzt.toFormat('yyyy-MM-dd HH:mm'),
};

// Drive-Suche nach vorhandener Thumbnail-Datei (gleicher Name im Ordner "Thumbnails")
const dateiname = name + '.jpg';
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const drive = {
  dateiname,
  query: `name = '${esc(dateiname)}' and '${esc(String(cfg.thumbnail_ordner_id))}' in parents and trashed = false`,
};

return [{ json: { zeile, drive } }];
