/**
 * MayoristasYa - Cobro con Mercado Pago + entrega automática del pack
 * ---------------------------------------------------------------------
 * Qué hace:
 *   1. Registra cada pedido en la planilla.
 *   2. Crea el link de pago de Mercado Pago cuando alguien compra.
 *   3. Escucha el aviso de Mercado Pago cuando el pago se aprueba.
 *   4. Verifica el pago contra la API de Mercado Pago (nunca confía en el aviso).
 *   5. Marca "Pagado" y manda por mail el archivo que corresponda a ese pack.
 *   6. Sigue funcionando el tilde manual de "Pagado" para las ventas por
 *      transferencia o WhatsApp.
 *
 * IMPORTANTE - DÓNDE VA ESTE CÓDIGO:
 *   Este script tiene que estar creado DESDE ADENTRO de la planilla:
 *   abrí la planilla y andá a Extensiones > Apps Script.
 *   Si lo creás suelto desde script.google.com no va a funcionar, porque
 *   no tendría ninguna planilla asociada donde escribir los pedidos.
 *
 *   La planilla necesita una hoja llamada "Pedidos" con estas 9 columnas:
 *   Fecha | Nombre | Email | Pedido | Total | Pagado | Enviado | Ref | ID de pago
 *
 * ANTES DE USARLO:
 *   a) Configuración del proyecto > Propiedades del script > agregar
 *      MP_ACCESS_TOKEN = tu Access Token (empieza con TEST- o APP_USR-).
 *      NUNCA pongas el token acá adentro ni en el sitio.
 *   b) Implementar > Nueva implementación > Aplicación web:
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier persona
 *      Copiá la URL /exec que te da y pasásela a Claude, para que la
 *      configure en js/pagos.js del sitio. NO hace falta pegarla acá adentro.
 *   c) Activadores (ícono del reloj) > Agregar activador:
 *        - Función: onEditInstallable
 *        - Origen del evento: Desde la hoja de cálculo
 *        - Tipo de evento: Al editar
 *      Esto habilita el tilde manual de "Pagado" para ventas por transferencia.
 *
 * Todo lo demás (precios, archivos de cada pack, tu sitio, tu mail) ya está
 * completo más abajo. No tenés que tocar nada.
 */

/* ====================== CONFIGURACIÓN ====================== */

var SHEET_NAME = "Pedidos";
var EMAIL_SUBJECT = "Tu pack de proveedores - MayoristasYa";

/**
 * Nombre que ve el comprador como remitente del mail.
 *
 * Sin esto, Gmail usa el nombre de tu cuenta de Google (aparecía
 * "lautileonardolopez"), que queda poco profesional en la bandeja de entrada.
 * La dirección de correo sigue siendo la misma, solo cambia el nombre visible.
 */
var EMAIL_REMITENTE = "MayoristasYa";

/**
 * Dirección desde la que sale el mail.
 *
 * ANTES DE QUE ESTO FUNCIONE hay que darla de alta en Gmail:
 *   Configuración -> Cuentas e importación -> "Enviar como" -> Añadir otra
 *   dirección, y confirmar el código que llega a esa casilla.
 *
 * Si todavía no lo hiciste, no pasa nada: el script se da cuenta y manda el
 * mail desde tu dirección de siempre. Dejalo vacío para no usar alias nunca.
 */
var EMAIL_ALIAS = "calamayoristasya@gmail.com";

// A dónde van las respuestas cuando el comprador le da "Responder" al mail.
var EMAIL_RESPUESTAS = "calamayoristasya@gmail.com";

// Tu sitio, sin barra final. Se usa para volver después de pagar.
var SITE_URL = "https://mayoristasya.com";

/**
 * NO HACE FALTA COMPLETAR ESTO.
 *
 * El script averigua su propia dirección solo, con ScriptApp.getService().
 * La necesita para decirle a Mercado Pago "avisame acá cuando se apruebe
 * el pago".
 *
 * Dejalo vacío y olvidate. Solo si algún día el aviso de Mercado Pago no
 * llegara, pegá acá la URL /exec y volvé a implementar.
 */
var SCRIPT_URL = "";

// Tu WhatsApp personal. Va en los mails del Negocio Mayorista y del Espacio
// Publicitario, que son los dos que necesitan que hables vos con el comprador.
var TEL_PERSONAL = "11 5513-5537";
var TEL_PERSONAL_WSP = "5491155135537";

// Te llega un mail a vos cada vez que se aprueba una venta. Dejalo vacío para no recibirlo.
var EMAIL_ADMIN = "calamayoristasya@gmail.com";

/**
 * Los packs: precio y archivo que se entrega.
 *
 * El sitio manda SOLO el id del pack, nunca el precio: si el precio viniera
 * del formulario, cualquiera podría editarlo desde el navegador y pagar $1.
 * Acá está la única fuente de verdad. Si cambiás un precio en index.html,
 * cambialo también acá.
 *
 * archivoId sale de la URL del archivo en tu Drive:
 *   drive.google.com/file/d/ESTE_ES_EL_ID/view
 *
 * Los archivos NO hace falta compartirlos ni hacerlos públicos: el script
 * corre con tu propia cuenta, así que los puede adjuntar aunque sean privados.
 *
 * El Negocio Mayorista va con archivoId null porque no es un archivo, es un
 * servicio: en ese caso se manda un mail avisando que te vas a contactar.
 */
var PACKS = {
  "100": {
    nombre: "Pack 100",
    precio: 4999,
    archivoId: "177h9bJ6CcsOeH-pDE6Yi4mGh0sdCPFGn",
  },
  "500": {
    nombre: "Pack 500",
    precio: 14999,
    archivoId: "1EjW_vAQ8DES99IFqqWL0ALyMKv4NCWWX",
  },
  "1000": {
    nombre: "Pack 1000",
    precio: 19999,
    archivoId: "1yuPWVJWEXmzeSzRHkWvGYJTPddYWfSh2",
  },
  "publicidad": {
    nombre: "Espacio Publicitario",
    precio: 24999,
    archivoId: null,
  },
  "negocio-mayorista": {
    nombre: "Negocio Mayorista",
    precio: 130000,
    archivoId: null,
  },
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
    notification_url: getScriptUrl(),
    /* Sin "#" en ninguna: Mercado Pago le pega sus parámetros al final y, si
       hay un ancla, queda una dirección rota tipo "/#precios?collection_id=..." */
    back_urls: {
      success: SITE_URL + "/gracias.html",
      pending: SITE_URL + "/gracias.html",
      failure: SITE_URL + "/",
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

/** Busca el pack por su nombre, que es lo que quedó guardado en la planilla. */
function buscarPackPorNombre(nombre) {
  var ids = Object.keys(PACKS);
  for (var i = 0; i < ids.length; i++) {
    if (PACKS[ids[i]].nombre === nombre) return PACKS[ids[i]];
  }
  return null;
}

/**
 * Manda un mail poniendo como remitente el alias del negocio.
 *
 * Si el alias no está verificado en Gmail, Google rechaza el envío. En ese caso
 * lo reintentamos sin alias: entre "sale desde otra dirección" y "el comprador
 * pagó y no recibió nada", lo segundo es mucho peor. El nombre visible
 * ("MayoristasYa") se mantiene en los dos casos.
 *
 * No usamos GmailApp.getAliases() para chequearlo de antemano a propósito: eso
 * obligaría a re-autorizar el script con permisos de Gmail.
 */
function enviarMail(opciones) {
  if (EMAIL_ALIAS) {
    try {
      var conAlias = {};
      for (var clave in opciones) {
        if (Object.prototype.hasOwnProperty.call(opciones, clave)) {
          conAlias[clave] = opciones[clave];
        }
      }
      conAlias.from = EMAIL_ALIAS;
      MailApp.sendEmail(conAlias);
      return;
    } catch (e) {
      console.warn(
        "No pude enviar desde " + EMAIL_ALIAS + ". ¿Lo diste de alta en " +
        "Gmail -> Cuentas e importación -> Enviar como? Mando desde la " +
        "dirección por defecto. Detalle: " + e
      );
    }
  }

  MailApp.sendEmail(opciones);
}

/* ====================== MAILS EN HTML ======================
 *
 * Los clientes de correo (Gmail, Outlook, Apple Mail) no soportan CSS
 * moderno: nada de flexbox, grid, variables ni hojas de estilo externas.
 * Por eso todo va con TABLAS y estilos en linea, que es lo unico que
 * renderiza parejo en todos lados. Ancho fijo de 600px, que es el estandar.
 *
 * Siempre se manda tambien la version en texto plano (opciones.body): si el
 * cliente no muestra HTML, el comprador igual lee todo.
 */

/** Un boton que se ve igual en todos los clientes (no se usa <button>). */
function botonMail(texto, url, color) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">' +
    '<tr><td align="center" bgcolor="' + color + '" style="border-radius:999px;">' +
    '<a href="' + url + '" target="_blank" style="display:inline-block;padding:14px 30px;' +
    'font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;' +
    'color:#ffffff;text-decoration:none;border-radius:999px;">' + texto + "</a>" +
    "</td></tr></table>"
  );
}

/** Recuadro destacado, para lo que no se tiene que pasar por alto. */
function cajaMail(titulo, contenidoHtml, colorFondo, colorBorde) {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'style="margin:20px 0;"><tr><td bgcolor="' + colorFondo + '" ' +
    'style="padding:18px 20px;border-radius:10px;border-left:4px solid ' + colorBorde + ';">' +
    (titulo
      ? '<p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:15px;' +
        'font-weight:bold;color:#241d3a;">' + titulo + "</p>"
      : "") +
    contenidoHtml +
    "</td></tr></table>"
  );
}

/** Un parrafo con el estilo del cuerpo. */
function pMail(texto) {
  return (
    '<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;' +
    'line-height:1.6;color:#55506b;">' + texto + "</p>"
  );
}

/**
 * Envuelve el contenido en la plantilla: cabecera violeta, tarjeta blanca
 * y pie. Devuelve el HTML completo del mail.
 */
function plantillaMail(titulo, bajada, cuerpoHtml) {
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + titulo + "</title></head>" +
    '<body style="margin:0;padding:0;background-color:#f4f2fb;">' +
    /* Preheader: el texto gris que Gmail muestra al lado del asunto */
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + bajada + "</div>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ' +
    'bgcolor="#f4f2fb" style="background-color:#f4f2fb;padding:24px 12px;">' +
    "<tr><td align=\"center\">" +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;">' +

    /* Cabecera */
    '<tr><td bgcolor="#6d4bd8" style="background-color:#6d4bd8;padding:22px 28px;">' +
    '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:18px;' +
    'font-weight:bold;color:#ffffff;letter-spacing:0.3px;">MayoristasYa</p>' +
    '<p style="margin:4px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;' +
    'color:#d9cffa;">Tus proveedores al instante</p>' +
    "</td></tr>" +

    /* Cuerpo */
    '<tr><td style="padding:30px 28px 12px;">' +
    '<h1 style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:23px;' +
    'line-height:1.25;color:#241d3a;">' + titulo + "</h1>" +
    '<p style="margin:0 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;' +
    'color:#736d8f;">' + bajada + "</p>" +
    cuerpoHtml +
    "</td></tr>" +

    /* Pie */
    '<tr><td bgcolor="#f7f5fc" style="background-color:#f7f5fc;padding:20px 28px;' +
    'border-top:1px solid #ece7f7;">' +
    '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;' +
    'line-height:1.6;color:#736d8f;">' +
    "Respondé este mail si necesitás algo. " +
    '<a href="' + SITE_URL + '" style="color:#6d4bd8;">mayoristasya.com</a>' +
    "</p></td></tr>" +

    "</table></td></tr></table></body></html>"
  );
}

/** Link de WhatsApp con el mensaje ya escrito. */
function wspLink(numero, mensaje) {
  return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensaje);
}

/** Manda el mail con el pack que corresponda y marca la fila como enviada. */
function entregarPack(sheet, row) {
  var nombre = sheet.getRange(row, COL_NOMBRE).getValue();
  var email = sheet.getRange(row, COL_EMAIL).getValue();
  var pedido = sheet.getRange(row, COL_PEDIDO).getValue();

  var pack = buscarPackPorNombre(pedido);
  if (!pack) {
    console.error("No reconozco el pedido '" + pedido + "'. Fila " + row + " sin enviar.");
    return;
  }

  /* El primer nombre solo: "Hola Lautaro" suena mejor que el nombre completo */
  var primerNombre = String(nombre).trim().split(/\s+/)[0] || "";

  var opciones = {
    to: email,
    subject: EMAIL_SUBJECT,
    name: EMAIL_REMITENTE
  };

  if (EMAIL_RESPUESTAS) opciones.replyTo = EMAIL_RESPUESTAS;

  if (pack.archivoId) {
    /* ---------- Packs de proveedores: va el PDF adjunto ---------- */
    var file = DriveApp.getFileById(pack.archivoId);

    opciones.subject = "Tu " + pack.nombre + " ya está acá - MayoristasYa";
    opciones.attachments = [file.getAs(file.getMimeType())];

    var cuerpo =
      pMail("Ya está todo listo. Tu <strong>" + pack.nombre + "</strong> va adjunto a este mail, " +
        "en PDF, organizado por rubro y listo para usar.") +
      cajaMail(
        "Cómo arrancar",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.7;color:#55506b;">' +
        "<strong>1.</strong> Descargá el PDF adjunto y guardalo en tu celular.<br>" +
        "<strong>2.</strong> Elegí tu rubro y buscá 3 o 4 proveedores.<br>" +
        "<strong>3.</strong> Escribiles hoy mismo preguntando precios y mínimos de compra.<br>" +
        "<strong>4.</strong> Comprá al precio de origen y revendé con ganancia." +
        "</p>",
        "#f7f5fc",
        "#6d4bd8"
      ) +
      pMail("Cada proveedor tiene su contacto directo: le escribís vos, sin intermediarios.") +
      '<div style="margin:24px 0 8px;">' +
      botonMail(
        "Escribinos por WhatsApp",
        wspLink("5491128520849", "Hola! Compré el " + pack.nombre + " y tengo una consulta."),
        "#2e7d50"
      ) +
      "</div>" +
      '<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;' +
      'color:#736d8f;text-align:center;">Pedido ' + pedido + "</p>";

    opciones.htmlBody = plantillaMail(
      "¡Gracias por tu compra, " + primerNombre + "!",
      "Tu " + pack.nombre + " está adjunto, listo para descargar.",
      cuerpo
    );

    opciones.body =
      "Hola " + primerNombre + "!\n\n" +
      "Ya está todo listo. Tu " + pack.nombre + " va adjunto a este mail, en PDF, " +
      "organizado por rubro y listo para usar.\n\n" +
      "CÓMO ARRANCAR\n" +
      "1. Descargá el PDF adjunto y guardalo en tu celular.\n" +
      "2. Elegí tu rubro y buscá 3 o 4 proveedores.\n" +
      "3. Escribiles hoy preguntando precios y mínimos de compra.\n" +
      "4. Comprá al precio de origen y revendé con ganancia.\n\n" +
      "Cada proveedor tiene su contacto directo: le escribís vos, sin intermediarios.\n\n" +
      "Cualquier duda, escribinos por WhatsApp al 11 2852-0849.\n\n" +
      "Pedido " + pedido + "\n\n" +
      "Saludos,\nEquipo MayoristasYa";

  } else if (pack.nombre === "Espacio Publicitario") {
    /* ---------- Publicidad: hay que pedirle los datos a publicar ---------- */
    opciones.subject = "Tu Espacio Publicitario está reservado - MayoristasYa";

    var wspPub = wspLink(
      TEL_PERSONAL_WSP,
      "Hola Lautaro! Compré el Espacio Publicitario (" + pedido + ") y te paso los datos de mi negocio."
    );

    var cuerpoPub =
      pMail("Tu espacio ya está reservado. Ahora falta un solo paso: pasarme los datos " +
        "que van a salir publicados.") +
      cajaMail(
        "Mandame estos 6 datos",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.8;color:#55506b;">' +
        "<strong>1.</strong> Nombre de tu negocio<br>" +
        "<strong>2.</strong> Rubro (tecnología, indumentaria, hogar…)<br>" +
        "<strong>3.</strong> Tu número de WhatsApp<br>" +
        "<strong>4.</strong> Tu web, si tenés<br>" +
        "<strong>5.</strong> Instagram y TikTok<br>" +
        "<strong>6.</strong> Una frase corta de qué vendés (2 renglones)" +
        "</p>",
        "#f7f5fc",
        "#6d4bd8"
      ) +
      cajaMail(
        "Escribime directo a mi WhatsApp",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.6;color:#55506b;">Soy Lautaro, me encargo yo de esto. ' +
        'Mandame los datos a <strong style="color:#241d3a;font-size:16px;">' +
        TEL_PERSONAL + "</strong> y en el día te lo dejo publicado.</p>",
        "#e3f5ec",
        "#2e7d50"
      ) +
      '<div style="margin:24px 0 8px;">' +
      botonMail("Escribirle a Lautaro", wspPub, "#2e7d50") +
      "</div>" +
      '<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;' +
      'color:#736d8f;text-align:center;">Pedido ' + pedido + "</p>";

    opciones.htmlBody = plantillaMail(
      "¡Listo, " + primerNombre + "! Tu espacio está reservado",
      "Falta un paso: pasarme los datos de tu negocio.",
      cuerpoPub
    );

    opciones.body =
      "Hola " + primerNombre + "!\n\n" +
      "Tu Espacio Publicitario ya está reservado. Falta un solo paso: pasarme los " +
      "datos que van a salir publicados.\n\n" +
      "MANDAME ESTOS 6 DATOS\n" +
      "1. Nombre de tu negocio\n" +
      "2. Rubro (tecnología, indumentaria, hogar...)\n" +
      "3. Tu número de WhatsApp\n" +
      "4. Tu web, si tenés\n" +
      "5. Instagram y TikTok\n" +
      "6. Una frase corta de qué vendés (2 renglones)\n\n" +
      "ESCRIBIME DIRECTO\n" +
      "Soy Lautaro, me encargo yo de esto. Mandame los datos por WhatsApp al " +
      TEL_PERSONAL + " y en el día te lo dejo publicado.\n\n" +
      "Pedido " + pedido + "\n\n" +
      "Saludos,\nLautaro - MayoristasYa";

  } else {
    /* ---------- Negocio Mayorista: arranca un proyecto, no un archivo ---------- */
    opciones.subject = "Arrancamos tu Negocio Mayorista - MayoristasYa";

    var wspNeg = wspLink(
      TEL_PERSONAL_WSP,
      "Hola Lautaro! Compré el Negocio Mayorista (" + pedido + ") y quiero arrancar con mi página."
    );

    var cuerpoNeg =
      pMail("Gracias por confiar. A partir de acá armamos tu propia página, con tu marca " +
        "y los 3 packs de proveedores adentro, lista para que vendas.") +
      cajaMail(
        "Los próximos pasos",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.8;color:#55506b;">' +
        "<strong>1.</strong> Elegís el nombre y te registramos el dominio<br>" +
        "<strong>2.</strong> Armamos el sitio con tu marca y tus colores<br>" +
        "<strong>3.</strong> Cargamos los 3 packs adentro<br>" +
        "<strong>4.</strong> Lo dejamos online y te enseñamos a usarlo" +
        "</p>",
        "#f7f5fc",
        "#6d4bd8"
      ) +
      cajaMail(
        "Escribime directo a mi WhatsApp",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.6;color:#55506b;">Soy Lautaro, te acompaño yo en todo el armado. ' +
        'Escribime a <strong style="color:#241d3a;font-size:16px;">' + TEL_PERSONAL +
        "</strong> contándome qué nombre querés para tu negocio y arrancamos hoy.</p>",
        "#e3f5ec",
        "#2e7d50"
      ) +
      cajaMail(
        "Para que lo tengas claro",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.6;color:#55506b;">Tu página <strong>no incluye pasarela de pago ' +
        "automática</strong>: las ventas se coordinan y se cobran por WhatsApp, igual que " +
        "hacemos nosotros. El mantenimiento es de <strong>$60.000 por mes</strong>.</p>",
        "#fdf2dd",
        "#c08a2e"
      ) +
      '<div style="margin:24px 0 8px;">' +
      botonMail("Escribirle a Lautaro", wspNeg, "#2e7d50") +
      "</div>" +
      '<p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;' +
      'color:#736d8f;text-align:center;">Pedido ' + pedido + "</p>";

    opciones.htmlBody = plantillaMail(
      "¡Arrancamos, " + primerNombre + "!",
      "Tu Negocio Mayorista ya está en marcha.",
      cuerpoNeg
    );

    opciones.body =
      "Hola " + primerNombre + "!\n\n" +
      "Gracias por confiar. A partir de acá armamos tu propia página, con tu marca y " +
      "los 3 packs de proveedores adentro, lista para que vendas.\n\n" +
      "LOS PRÓXIMOS PASOS\n" +
      "1. Elegís el nombre y te registramos el dominio\n" +
      "2. Armamos el sitio con tu marca y tus colores\n" +
      "3. Cargamos los 3 packs adentro\n" +
      "4. Lo dejamos online y te enseñamos a usarlo\n\n" +
      "ESCRIBIME DIRECTO\n" +
      "Soy Lautaro, te acompaño yo en todo el armado. Escribime al " + TEL_PERSONAL +
      " contándome qué nombre querés para tu negocio y arrancamos hoy.\n\n" +
      "PARA QUE LO TENGAS CLARO\n" +
      "Tu página no incluye pasarela de pago automática: las ventas se coordinan y se " +
      "cobran por WhatsApp. El mantenimiento es de $60.000 por mes.\n\n" +
      "Pedido " + pedido + "\n\n" +
      "Saludos,\nLautaro - MayoristasYa";
  }

  enviarMail(opciones);

  sheet.getRange(row, COL_ENVIADO).setValue(true);

  if (EMAIL_ADMIN) {
    enviarMail({
      to: EMAIL_ADMIN,
      subject: "Venta confirmada: " + pedido,
      name: EMAIL_REMITENTE,
      body:
        "Comprador: " + nombre + "\nEmail: " + email + "\nPedido: " + pedido +
        "\n\nYa se le envió el mail de entrega."
    });
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

/**
 * La dirección de este script. Si no la completaste arriba, la averigua sola.
 * Es lo que le pasamos a Mercado Pago como notification_url.
 */
function getScriptUrl() {
  if (SCRIPT_URL && SCRIPT_URL.indexOf("PEGA_ACA") === -1) return SCRIPT_URL;
  return ScriptApp.getService().getUrl();
}

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

/* Estilos de las dos pantallas intermedias. Se ven un segundo, pero en
   celular tienen que verse bien igual. */
var CSS_INTERMEDIA =
  "<style>" +
  "body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;" +
  "display:flex;align-items:center;justify-content:center;padding:1.5rem;" +
  "background:#f3f5f1;color:#16233c;text-align:center;line-height:1.6}" +
  "p{margin:0 0 1rem}a{color:#6c3ce0;font-weight:600}" +
  "</style>";

/**
 * Manda al comprador a Mercado Pago.
 *
 * DOS DETALLES QUE IMPORTAN EN CELULAR:
 *
 * 1. Apps Script muestra esta página DENTRO de un iframe suyo. Si redirigimos
 *    con un meta refresh, Mercado Pago cargaría adentro de ese iframe y se
 *    vería con formato de escritorio, apretado y sin zoom. Por eso redirigimos
 *    con JavaScript apuntando a window.top: así reemplazamos la pestaña entera.
 *
 * 2. HtmlService borra las etiquetas <meta> que uno escriba a mano. El viewport
 *    hay que agregarlo con .addMetaTag(), si no el celular renderiza a 980px
 *    de ancho como si fuera una compu.
 *
 * Usamos location.replace en vez de href para que el botón "atrás" del
 * navegador no traiga al comprador de vuelta a esta pantalla intermedia.
 */
/**
 * Devuelve el link de pago de Mercado Pago.
 *
 * Esta respuesta se carga de dos formas distintas, y contempla las dos:
 *
 *   1. NORMAL: el sitio la pide desde un iframe escondido. Le avisamos el
 *      link con postMessage y el sitio viaja solo. El comprador nunca ve
 *      esta pantalla ni el cartel de Google.
 *
 *   2. PLAN B: si lo anterior falla, el sitio navega directamente acá. En ese
 *      caso sí se ve esta pantalla un segundo, y redirigimos por JavaScript.
 *
 * El postMessage va a window.top porque Apps Script anida su contenido en un
 * iframe propio: window.parent es la página de Google, window.top es el sitio.
 */
function htmlRedirect(url) {
  var safe = String(url).replace(/"/g, "&quot;");
  var html =
    CSS_INTERMEDIA +
    "<div>" +
    "<p>Te estamos llevando a Mercado Pago...</p>" +
    '<p><a href="' + safe + '" target="_top">Si no pasa nada en unos segundos, tocá acá.</a></p>' +
    "</div>" +
    "<script>" +
    'var u = "' + safe + '";' +
    'try { if (window.top && window.top !== window) { window.top.postMessage({ mwInitPoint: u }, "*"); } } catch (e) {}' +
    /* Le damos medio segundo al sitio para que reaccione al mensaje. Si
       seguimos acá, es que estamos en el plan B: redirigimos nosotros. */
    "setTimeout(function () {" +
    "  try { window.top.location.href = u; }" +
    "  catch (e1) { try { parent.location.href = u; } catch (e2) { window.location.href = u; } }" +
    "}, 500);" +
    "<\/script>";

  return HtmlService.createHtmlOutput(html)
    .setTitle("Redirigiendo a Mercado Pago...")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function htmlError(mensaje) {
  var html =
    CSS_INTERMEDIA +
    "<div>" +
    "<p>" + mensaje + "</p>" +
    '<p><a href="' + SITE_URL + '" target="_top">Volver al sitio</a></p>' +
    "</div>";

  return HtmlService.createHtmlOutput(html)
    .setTitle("Ups")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
