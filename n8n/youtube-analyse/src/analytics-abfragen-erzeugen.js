// Ein Item pro Analytics-Abfrage ({key, url}); der Video-Kontext reist als ctx mit
const cfg = $('Konfiguration').first().json;
const tz = cfg.zeitzone || 'Europe/Berlin';
const ctx = $input.first().json;
const id = ctx.video.id;

const heute = DateTime.now().setZone(tz).toISODate();
// Lifetime ab UTC-Veröffentlichungsdatum; ein Tag Puffer, weil Analytics in US-Pacific-Zeit zählt
const lifetime = DateTime.fromISO(ctx.video.snippet.publishedAt, { zone: 'utc' }).minus({ days: 1 }).toISODate();
const ab = monate => {
  const d = DateTime.now().setZone(tz).minus({ months: monate }).toISODate();
  return d < lifetime ? lifetime : d;
};

const BASIS = 'https://youtubeanalytics.googleapis.com/v2/reports';
const abfrage = (key, parameter) => {
  const p = Object.assign({ ids: 'channel==MINE', startDate: lifetime, endDate: heute, filters: 'video==' + id }, parameter);
  const qs = Object.entries(p).map(([k, w]) => k + '=' + encodeURIComponent(w)).join('&');
  return { json: { key, url: BASIS + '?' + qs, ctx } };
};

return [
  abfrage('basis', { metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost' }),
  abfrage('wz_3m', { startDate: ab(3), metrics: 'views,estimatedMinutesWatched' }),
  abfrage('wz_6m', { startDate: ab(6), metrics: 'views,estimatedMinutesWatched' }),
  abfrage('wz_12m', { startDate: ab(12), metrics: 'views,estimatedMinutesWatched' }),
  abfrage('karten', { metrics: 'cardImpressions,cardClicks,cardClickRate,cardTeaserImpressions,cardTeaserClicks' }),
  abfrage('format', { dimensions: 'creatorContentType', metrics: 'views' }),
  abfrage('quellen', { dimensions: 'insightTrafficSourceType', metrics: 'views' }),
  abfrage('suche', { dimensions: 'insightTrafficSourceDetail', metrics: 'views', filters: `video==${id};insightTrafficSourceType==YT_SEARCH`, sort: '-views', maxResults: 10 }),
  abfrage('extern', { dimensions: 'insightTrafficSourceDetail', metrics: 'views', filters: `video==${id};insightTrafficSourceType==EXT_URL`, sort: '-views', maxResults: 10 }),
  abfrage('bindung', { dimensions: 'elapsedVideoTimeRatio', metrics: 'audienceWatchRatio,relativeRetentionPerformance' }),
  abfrage('demografie', { dimensions: 'ageGroup,gender', metrics: 'viewerPercentage' }),
  // Alle Länder holen (Top 3 im Code), damit sich die Anteile in % berechnen lassen
  abfrage('laender', { dimensions: 'country', metrics: 'views', sort: '-views' }),
  abfrage('geraete', { dimensions: 'deviceType', metrics: 'views' }),
  abfrage('abostatus', { dimensions: 'subscribedStatus', metrics: 'views' }),
];
