// Drive-Link ergänzen; Ergebnis enthält nur Spalten des Blatts "Videos"
const zeile = Object.assign({}, $('Zeile zusammenbauen').first().json.zeile);
const drive = $input.first().json || {};
let dateiId = (!drive.error && drive.id) ? drive.id : '';
if (!dateiId) {
  const vorhanden = $('Thumbnail suchen').first().json;
  if (vorhanden && vorhanden.id) dateiId = vorhanden.id;
}
zeile['Thumbnail-Datei (Drive)'] = dateiId ? `https://drive.google.com/file/d/${dateiId}/view` : '';
return [{ json: zeile }];
