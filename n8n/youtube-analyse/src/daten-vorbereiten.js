// Maps aufbauen (Playlists, Kategorien, Studio-Export) und ein Item pro Video ausgeben
const videos = $('Nur öffentliche Videos').first().json.videos;

// --- Playlists: videoId -> Playlist-Titel ---
const playlistTitel = {};
for (const it of $('Playlist-Liste').all()) {
  if (it.json.playlistId) playlistTitel[it.json.playlistId] = it.json.title;
}
const videoPlaylists = {};
for (const seite of $('Playlist-Videos holen').all()) {
  for (const pi of seite.json.items || []) {
    const sn = pi.snippet || {};
    const videoId = (sn.resourceId && sn.resourceId.videoId) || (pi.contentDetails && pi.contentDetails.videoId);
    const titel = playlistTitel[sn.playlistId];
    if (!videoId || !titel) continue;
    if (!videoPlaylists[videoId]) videoPlaylists[videoId] = [];
    if (!videoPlaylists[videoId].includes(titel)) videoPlaylists[videoId].push(titel);
  }
}

// --- Kategorien: categoryId -> Name ---
const kategorien = {};
for (const seite of $('Kategorien holen').all()) {
  for (const k of seite.json.items || []) kategorien[k.id] = (k.snippet && k.snippet.title) || '';
}

// --- Studio-Export: videoId -> Impressionen/CTR/Endbildschirm ---
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
const zahl = wert => {
  if (wert === null || wert === undefined || wert === '') return '';
  if (typeof wert === 'number') return wert;
  let s = String(wert).replace(/[%\s ]/g, '');
  // deutsches Format: "1.234,5" bzw. "1.234" (Punkt = Tausendertrenner)
  if (s.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return s !== '' && isFinite(n) ? n : '';
};

// Spalten tolerant erkennen (deutsch/englisch, Groß-/Kleinschreibung egal)
function spaltenErkennen(namen) {
  const sp = {};
  for (const name of namen) {
    const n = norm(name);
    const ende = n.includes('endbildschirm') || n.includes('endscreen');
    const rate = n.includes('klickrate') || n.includes('clickthroughrate') || n.includes('clickrate') || n.includes('ctr');
    const impr = n.includes('impression');
    const klicks = n.includes('klicks') || n.includes('clicks');
    if (!sp.id && ['inhalt', 'content', 'videoid', 'video'].includes(n)) sp.id = name;
    else if (!ende && !rate && ['impressionen', 'impressions'].includes(n)) sp.impressionen = name;
    else if (!ende && rate && impr) sp.ctr = name;
    else if (ende && rate) sp.endCtr = name;
    else if (ende && impr) sp.endImpressionen = name;
    else if (ende && klicks) sp.endKlicks = name;
  }
  return sp;
}

const studioZeilen = $('Studio-Export lesen').all().map(i => i.json).filter(z => z && !z.error);
const alleSpalten = [...new Set(studioZeilen.flatMap(z => Object.keys(z)))];
const sp = spaltenErkennen(alleSpalten);
const studio = {};
if (sp.id) {
  for (const z of studioZeilen) {
    const id = String(z[sp.id] || '').trim();
    // Summenzeile "Gesamt"/"Total" und sonstige Nicht-Video-Zeilen überspringen
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    studio[id] = {
      impressionen: sp.impressionen ? zahl(z[sp.impressionen]) : '',
      ctr: sp.ctr ? zahl(z[sp.ctr]) : '',
      endImpressionen: sp.endImpressionen ? zahl(z[sp.endImpressionen]) : '',
      endKlicks: sp.endKlicks ? zahl(z[sp.endKlicks]) : '',
      endCtr: sp.endCtr ? zahl(z[sp.endCtr]) : '',
    };
  }
}

return videos.map(video => ({
  json: {
    video,
    playlists: (videoPlaylists[video.id] || []).join(' | '),
    kategorie: kategorien[video.snippet.categoryId] || video.snippet.categoryId || '',
    studio: studio[video.id] || {},
    studioSpalten: sp,
  },
}));
