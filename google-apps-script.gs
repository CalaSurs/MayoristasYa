/**
 * MayoristasYa - Registro y envío automático de pedidos
 * -------------------------------------------------------
 * Este archivo es solo de referencia (no se usa en la web).
 * Pegá este código en el editor de Apps Script de tu Google Sheet:
 * Extensiones > Apps Script.
 */

var SHEET_NAME = "Pedidos";
var EMAIL_SUBJECT = "Tu pack de proveedores - MayoristasYa";

// Pegá acá el ID del archivo real (PDF/Excel) que subiste a tu Google Drive.
// Lo sacás de la URL: drive.google.com/file/d/ESTE_ES_EL_ID/view
var PACK_FILE_ID = "PEGA_ACA_EL_ID_DE_TU_ARCHIVO";

var COL_FECHA = 1;
var COL_NOMBRE = 2;
var COL_EMAIL = 3;
var COL_PEDIDO = 4;
var COL_TOTAL = 5;
var COL_PAGADO = 6;
var COL_ENVIADO = 7;

/**
 * Recibe los pedidos que manda la web (index.html) cada vez que alguien
 * completa el checkout, y los agrega como una fila nueva en la planilla.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([new Date(), data.name, data.email, data.items, data.total, false, false]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Se ejecuta cada vez que editás cualquier celda de la planilla.
 * Cuando tildás "Pagado" en una fila, manda el mail con el pack adjunto
 * y tilda "Enviado" para no volver a mandarlo dos veces.
 *
 * IMPORTANTE: esta función NO se activa sola. Hay que crear un
 * "activador instalable" (ver instrucciones del chat, paso 4).
 */
function onEditInstallable(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (e.range.getRow() === 1) return; // ignorar edición de encabezados

  var isPagadoColumn = e.range.getColumn() === COL_PAGADO;
  var isMarkedTrue = e.value === "TRUE";
  if (!isPagadoColumn || !isMarkedTrue) return;

  var row = e.range.getRow();
  var enviadoCell = sheet.getRange(row, COL_ENVIADO);
  if (enviadoCell.getValue() === true) return; // ya se había enviado

  var nombre = sheet.getRange(row, COL_NOMBRE).getValue();
  var email = sheet.getRange(row, COL_EMAIL).getValue();
  var pedido = sheet.getRange(row, COL_PEDIDO).getValue();

  var body =
    "Hola " + nombre + "!\n\n" +
    "Gracias por tu compra en MayoristasYa (" + pedido + ").\n" +
    "Te enviamos adjunto tu pack completo de proveedores, organizado y listo para usar.\n\n" +
    "Cualquier duda, escribinos por WhatsApp.\n\n" +
    "Saludos,\nEquipo MayoristasYa";

  var file = DriveApp.getFileById(PACK_FILE_ID);

  MailApp.sendEmail({
    to: email,
    subject: EMAIL_SUBJECT,
    body: body,
    attachments: [file.getAs(file.getMimeType())],
  });

  enviadoCell.setValue(true);
}
