/**
 * MayoristasYa - Cobro con Mercado Pago + entrega automática del pack
 * ---------------------------------------------------------------------
 * Este archivo REEMPLAZA a google-apps-script.gs cuando actives Mercado Pago.
 * Hace todo lo que hacía el anterior (registrar pedidos, mandar el pack por
 * mail, tilde manual de "Pagado") y además:
 *
 *   1. Crea el link de pago de Mercado Pago cuando alguien compra.
 *   2. Escucha el aviso de Mercado Pago cuando el pago se aprueba.
 *   3. Verifica el pago contra la API de Mercado Pago (nunca confía en el aviso).
 *   4. Marca "Pagado" y manda el pack por mail, solo.
 *
 * ANTES DE USARLO:
 *   a) Configuración del proyecto > Propiedades del script > agregar
 *      MP_ACCESS_TOKEN = tu Access Token de producción (empieza con APP_USR-).
 *      NUNCA pongas el token acá adentro ni en el sitio.
 *   b) Completá PACK_FILE_ID, SITE_URL y EMAIL_ADMIN acá abajo.
 *   c) Implementar > Nueva implementación > Aplicación web:
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier persona
 *      Copiá la URL /exec y pegala en SCRIPT_URL y en js/checkout-mp.js del sitio.
 */

/* ====================== CONFIGURACIÓN ====================== */

var SHEET_NAME = "Pedidos";
var EMAIL_SUBJECT = "Tu pack de proveedores - MayoristasYa";

// ID del archivo real (PDF/Excel) del pack en tu Google Drive.
// Lo sacás de la URL: drive.google.com/file/d/ESTE_ES_EL_ID/view
var PACK_FILE_ID = "PEGA_ACA_EL_ID_DE_TU_ARCHIVO";

// Tu sitio, sin barra final. Se usa para volver después de pagar.
var SITE_URL = "https://www.mayoristasya.com";

// La URL /exec de este mismo script (la copiás al implementarlo).
var SCRIPT_URL = "PEGA_ACA_LA_URL_EXEC_DE_ESTE_SCRIPT";

// Te llega un mail a vos cada vez que se aprueba una venta. Dejalo vacío para no recibirlo.
var EMAIL_ADMIN = "calamayoristasya@gmail.com";

/**
 * Precios oficiales. El sitio manda SOLO el id del pack, nunca el precio:
 * si el precio viniera del formulario, cualquiera podría editarlo desde el
 * navegador y pagar $1. Acá está la única fuente de verdad.
 * Si cambiás un precio en index.html, cambialo también acá.
 */
var PACKS = {
  "100": { nombre: "Pack 100", precio: 4999 },
  "500": { nombre: "Pack 500", precio: 14999 },
  "1000": { nombre: "Pack 1000", precio: 19999 },
  "negocio-mayorista": { nombre: "Negocio Mayorista", precio: 79999 },
};

var COL_FECHA = 1;
var COL_NOMBRE = 2;
var COL_EMAIL = 3;
var COL_PEDIDO = 4;
var COL_TOTAL = 5;
var COL_PAGADO = 6;
var COL_ENVIADO = 7;
var COL_REF = 8; // referencia del pedido (ORD-...)
var COL_PAGO_ID = 9; // id del pago en Mercado Pago

/* ====================== ENTRADA ÚNICA ====================== */

/**
 * Todo entra por acá. Hay tres tipos de visita:
 *   - action=pagar        → el comprador tocó "Pagar con Mercado Pago"
 *   - type/topic=payment  → Mercado Pago avisa que pasó algo con un pago
 *   - {name, email, ...}  → pedido del checkout por WhatsApp (lo de siempre)
 */
function doPost(e) {
  if (e && e.parameter && e.parameter.action === "pagar") {
    return crearPreferencia(e);
  }

  var body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      body = {};
    }
  }

  var tipo = body.type || (e && e.parameter && (e.parameter.type || e.parameter.topic));

  if (tipo === "payment") {
    var pagoId =
      (body.data && body.data.id) ||
      (e && e.parameter && (e.parameter["data.id"] || e.parameter.id));
    // Si esto tira error, Apps Script responde 500 y Mercado Pago reintenta
    // más tarde. Es lo que queremos ante una falla pasajera.
    procesarPago(String(pagoId));
    return jsonOk();
  }

  if (body.name) {
    registrarPedido(body.name, body.email, body.items, body.total, "");
    return jsonOk();
  }

  return jsonOk();
}

/* ====================== 1. CREAR EL LINK DE PAGO ====================== */

/**
 * Recibe el formulario del sitio, registra el pedido como "no pagado",
 * le pide a Mercado Pago un link de pago y manda al comprador ahí.
 */
function crearPreferencia(e) {
  var packId = String(e.parameter.pack_id || "").trim();
  var nombre = String(e.parameter.nombre || "").trim();
  var email = String(e.parameter.email || "").trim();

  var pack = PACKS[packId];
  if (!pack) return htmlError("No encontramos el pack seleccionado.");
  if (nombre.length < 3) return htmlError("Falta el nombre del comprador.");
  if (email.indexOf("@") === -1) return htmlError("El email no es válido.");

  var ref =
    "ORD-" +
    Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd-HHmmss") +
    "-" +
    Math.floor(Math.random() * 900 + 100);

  registrarPedido(nombre, email, pack.nombre, pack.precio, ref);

  var preferencia = {
    items: [
      {
        title: pack.nombre,
        description: "Pack de proveedores mayoristas - MayoristasYa",
        quantity: 1,
        unit_price: pack.precio,
        currency_id: "ARS",
      },
    ],
    payer: { name: nombre, email: email },
    external_reference: ref,
    notification_url: SCRIPT_URL,
    back_urls: {
      success: SITE_URL + "/gracias.html",
      pending: SITE_URL + "/gracias.html",
      failure: SITE_URL + "/#precios",
    },
    auto_return: "approved",
    statement_descriptor: "MAYORISTASYA",
  };

  var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + getToken() },
    payload: JSON.stringify(preferencia),
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  var data = JSON.parse(res.getContentText());

  if (code !== 200 && code !== 201) {
    console.error("Mercado Pago rechazó la preferencia: " + res.getContentText());
    return htmlError("No pudimos generar el link de pago. Escribinos por WhatsApp y lo resolvemos.");
  }

  return htmlRedirect(data.init_point);
}

/* ====================== 2. RECIBIR Y VERIFICAR EL PAGO ====================== */

/**
 * Mercado Pago avisa "pasó algo con el pago X". El aviso NO dice si está
 * aprobado (y podría mandarlo cualquiera), así que le preguntamos a la API
 * de Mercado Pago con nuestro token. Esa respuesta sí es confiable.
 */
function procesarPago(pagoId) {
  if (!pagoId || pagoId === "undefined") return;

  var res = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + pagoId, {
    method: "get",
    headers: { Authorization: "Bearer " + getToken() },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    console.error("No pudimos consultar el pago " + pagoId + ": " + res.getContentText());
    return;
  }

  var pago = JSON.parse(res.getContentText());
  if (pago.status !== "approved") return; // pendiente, rechazado o devuelto: no entregamos nada

  var ref = pago.external_reference;
  if (!ref) return;

  // Dos avisos de Mercado Pago pueden llegar casi juntos. El lock evita
  // que se mande el pack dos veces por el mismo pago.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var row = buscarFilaPorRef(sheet, ref);
    if (!row) {
      console.error("Pago aprobado sin pedido en la planilla. Ref: " + ref);
      return;
    }

    if (sheet.getRange(row, COL_ENVIADO).getValue() === true) return; // ya entregado

    sheet.getRange(row, COL_PAGADO).setValue(true);
    sheet.getRange(row, COL_PAGO_ID).setValue(pagoId);
    entregarPack(sheet, row);
  } finally {
    lock.releaseLock();
  }
}

/* ====================== 3. ENTREGAR EL PACK ====================== */

/** Manda el mail con el pack adjunto y deja la fila marcada como enviada. */
function entregarPack(sheet, row) {
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

  sheet.getRange(row, COL_ENVIADO).setValue(true);

  if (EMAIL_ADMIN) {
    MailApp.sendEmail(
      EMAIL_ADMIN,
      "Venta confirmada: " + pedido,
      "Comprador: " + nombre + "\nEmail: " + email + "\nPedido: " + pedido + "\n\nYa se le envió el pack."
    );
  }
}

/* ====================== TILDE MANUAL (sigue funcionando) ====================== */

/**
 * Para las ventas por transferencia/WhatsApp: tildás "Pagado" a mano en la
 * planilla y se manda el pack igual que antes.
 * Necesita un activador instalable: Activadores > Agregar > onEditInstallable
 * > Al editar.
 */
function onEditInstallable(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (e.range.getRow() === 1) return;
  if (e.range.getColumn() !== COL_PAGADO) return;
  if (e.value !== "TRUE") return;

  var row = e.range.getRow();
  if (sheet.getRange(row, COL_ENVIADO).getValue() === true) return;

  entregarPack(sheet, row);
}

/* ====================== AUXILIARES ====================== */

function getToken() {
  var t = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!t) {
    throw new Error(
      "Falta MP_ACCESS_TOKEN en Configuración del proyecto > Propiedades del script."
    );
  }
  return t;
}

function registrarPedido(nombre, email, pedido, total, ref) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.appendRow([new Date(), nombre, email, pedido, total, false, false, ref, ""]);
}

function buscarFilaPorRef(sheet, ref) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return null;
  var refs = sheet.getRange(2, COL_REF, ultima - 1, 1).getValues();
  for (var i = refs.length - 1; i >= 0; i--) {
    if (String(refs[i][0]) === String(ref)) return i + 2;
  }
  return null;
}

function jsonOk() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON
  );
}

function htmlRedirect(url) {
  var safe = String(url).replace(/"/g, "&quot;");
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8">' +
      '<meta http-equiv="refresh" content="0; url=' + safe + '">' +
      '<title>Redirigiendo a Mercado Pago...</title>' +
      '<p style="font-family:system-ui;padding:2rem">Te estamos llevando a Mercado Pago...<br><br>' +
      '<a href="' + safe + '">Si no pasa nada en unos segundos, tocá acá.</a></p>' +
      '<script>window.top.location.href="' + safe + '";<\/script>'
  );
}

function htmlError(mensaje) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><title>Ups</title>' +
      '<p style="font-family:system-ui;padding:2rem">' + mensaje + '<br><br>' +
      '<a href="' + SITE_URL + '">Volver al sitio</a></p>'
  );
}
