// Nur öffentliche Videos, chronologisch sortiert; max_videos > 0 begrenzt die Anzahl (Test-Modus)
const cfg = $('Konfiguration').first().json;
let videos = [];
for (const seite of $input.all()) {
  for (const v of seite.json.items || []) {
    if (v.status && v.status.privacyStatus === 'public') videos.push(v);
  }
}
videos.sort((a, b) => a.snippet.publishedAt.localeCompare(b.snippet.publishedAt));

const max = Number(cfg.max_videos) || 0;
if (max > 0) videos = videos.slice(0, max);
if (videos.length === 0) throw new Error('Keine öffentlichen Videos gefunden.');

return [{ json: { anzahl: videos.length, videos } }];
