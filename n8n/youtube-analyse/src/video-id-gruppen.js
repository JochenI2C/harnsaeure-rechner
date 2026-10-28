// Konfiguration prüfen, dann alle Video-IDs der Upload-Playlist sammeln und in 50er-Gruppen teilen
const cfg = $('Konfiguration').first().json;
for (const feld of ['ziel_sheet_id', 'thumbnail_ordner_id', 'studio_export_sheet_id']) {
  if (!cfg[feld] || String(cfg[feld]).startsWith('HIER_')) {
    throw new Error(`Bitte im Node "Konfiguration" das Feld "${feld}" ausfüllen.`);
  }
}

const ids = [];
for (const seite of $input.all()) {
  if (seite.json.error) {
    throw new Error('Upload-Playlist konnte nicht gelesen werden: ' + JSON.stringify(seite.json.error));
  }
  for (const it of seite.json.items || []) {
    const id = it.contentDetails && it.contentDetails.videoId;
    if (id && !ids.includes(id)) ids.push(id);
  }
}
if (ids.length === 0) throw new Error('Keine Videos in der Upload-Playlist gefunden.');

const gruppen = [];
for (let i = 0; i < ids.length; i += 50) {
  gruppen.push({ json: { ids: ids.slice(i, i + 50).join(',') } });
}
return gruppen;
