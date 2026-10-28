// Eine Zeile pro Playlist; ohne Playlists ein Platzhalter, damit der Workflow weiterläuft
const playlists = [];
for (const seite of $input.all()) {
  for (const p of seite.json.items || []) {
    playlists.push({ json: { playlistId: p.id, title: (p.snippet && p.snippet.title) || '' } });
  }
}
if (playlists.length === 0) playlists.push({ json: { playlistId: '', title: '' } });
return playlists;
