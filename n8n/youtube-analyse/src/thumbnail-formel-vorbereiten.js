// Nur Video-ID (Abgleich) und die =IMAGE()-Formel – wird mit USER_ENTERED geschrieben
const id = $('Zeile fertigstellen').first().json['Video-ID'];
return [{ json: { 'Video-ID': id, 'Thumbnail': `=IMAGE("https://i.ytimg.com/vi/${id}/default.jpg")` } }];
