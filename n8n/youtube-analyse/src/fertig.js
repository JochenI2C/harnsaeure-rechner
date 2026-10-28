// Zusammenfassung des Laufs
return [{ json: { verarbeitete_videos: $('Daten vorbereiten').all().length, fertig_um: DateTime.now().setZone($('Konfiguration').first().json.zeitzone || 'Europe/Berlin').toFormat('yyyy-MM-dd HH:mm') } }];
