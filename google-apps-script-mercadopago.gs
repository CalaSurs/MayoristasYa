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
 *   Fecha | Nombre | Email | Pedido | Total | Pagado | Enviado | Ref | ID de pago | Ficha
 *   (la última se llena sola, y solo en las compras de Negocio Mayorista)
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
 *   d) PANEL DE VENTAS: elegí la función generarClavePanel en la lista de
 *      arriba y tocá Ejecutar. En "Registro de ejecución" aparece la clave:
 *      pegala en panel/index.html la primera vez que lo abras. Después
 *      Implementar > Administrar implementaciones > editar > Nueva versión.
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
 *
 * El "tipo" decide qué mail recibe el comprador:
 *   proveedores → el PDF con los contactos
 *   ebook       → el libro, con otro texto (no es una lista de proveedores)
 *   publicidad  → le pedimos los datos de su negocio para publicarlo
 *   servicio    → el Negocio Mayorista, que arranca con una charla
 */
var PACKS = {
  "100": {
    nombre: "Pack 100",
    precio: 4999,
    tipo: "proveedores",
    archivoId: "177h9bJ6CcsOeH-pDE6Yi4mGh0sdCPFGn",
  },
  "500": {
    nombre: "Pack 500",
    precio: 14999,
    tipo: "proveedores",
    archivoId: "1EjW_vAQ8DES99IFqqWL0ALyMKv4NCWWX",
  },
  "1000": {
    nombre: "Pack 1000",
    precio: 19999,
    tipo: "proveedores",
    archivoId: "1yuPWVJWEXmzeSzRHkWvGYJTPddYWfSh2",
  },
  "ebook": {
    nombre: "De 0 a tu primer millón",
    precio: 5000,
    tipo: "ebook",
    archivoId: "1FJdiKGlxlqwKTZPlrFMtEarJZU4B_rfN",
  },
  "publicidad": {
    nombre: "Espacio Publicitario",
    precio: 24999,
    tipo: "publicidad",
    archivoId: null,
  },
  "negocio-mayorista": {
    nombre: "Negocio Mayorista",
    precio: 130000,
    tipo: "servicio",
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
var COL_FICHA = 10; // Negocio Mayorista: cómo quiere su página

/* ====================== ENTRADA ÚNICA ====================== */

/**
 * Todo entra por acá. Hay tres tipos de visita:
 *   - action=pagar        → el comprador tocó "Pagar con Mercado Pago"
 *   - type/topic=payment  → Mercado Pago avisa que pasó algo con un pago
 *   - {name, email, ...}  → pedido del checkout por WhatsApp (lo de siempre)
 *   - {action: "panel"}     → el panel de ventas pide los números (con clave)
 *   - {action: "enviar"}    → desde el panel: mandarle un pack a alguien
 *   - {action: "reenviar"}  → desde el panel: volver a mandar un pedido
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

  /* Panel de ventas privado: todo esto responde solo si la clave coincide */
  if (body.action === "panel") {
    return panelDatos(body.clave);
  }

  if (body.action === "enviar") {
    return panelEnviar(body);
  }

  if (body.action === "reenviar") {
    return panelReenviar(body);
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
    registrarPedido(body.name, body.email, body.items, body.total, "", "", body.ficha);
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
  var token = limpiarToken(e.parameter.token);
  var ficha = limpiarFicha(e.parameter.ficha);

  var pack = PACKS[packId];
  if (!pack) return htmlError("No encontramos el pack seleccionado.");
  if (nombre.length < 3) return htmlError("Falta el nombre del comprador.");
  if (email.indexOf("@") === -1) return htmlError("El email no es válido.");

  /* El token lo genera el navegador una vez por compra. Si el sitio manda el
     formulario dos veces (ver el plan B de js/pagos.js), acá reconocemos que
     es la MISMA compra y reusamos la fila en vez de anotarla de nuevo. */
  var ref = registrarPedido(nombre, email, pack.nombre, pack.precio, "", token, ficha);

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
    invalidarPanel();
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

/**
 * Deja un texto listo para meter adentro de un mail HTML.
 *
 * Hace falta porque parte de lo que sale en los mails lo escribió otra
 * persona: su nombre, o lo que contestó en el checkout. Si eso llegara tal
 * cual, cualquiera podría escribir etiquetas en un campo y aparecerían como
 * HTML en el mail que abrís vos.
 */
function escaparHtml(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;");
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

/**
 * El pie con el número de orden. Va en TODOS los mails, abajo de todo.
 *
 * Es el dato que cierra cualquier reclamo: el comprador lo copia y pega en
 * WhatsApp, y vos lo buscás igual en la planilla y en el panel. Antes acá solo
 * decía el nombre del pack ("Pedido Pack 500"), que no identificaba nada.
 */
function pieOrdenHtml(pedido, ref) {
  return (
    '<p style="margin:20px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;' +
    'line-height:1.6;color:#736d8f;text-align:center;">' + pedido +
    (ref
      ? '<br><span style="font-size:12px;">Orden N.º <strong style="color:#241d3a;">' +
        ref + "</strong></span>"
      : "") +
    "</p>"
  );
}

function pieOrdenTexto(pedido, ref) {
  return "Pedido: " + pedido + (ref ? "\nOrden N.º: " + ref : "");
}

/**
 * "Si después lo perdés, buscá MayoristasYa en tu correo."
 *
 * Es la consulta número uno: la gente archiva el mail, no se acuerda de dónde
 * quedó, y escribe pensando que nunca se lo mandaron. Decírselo el día que lo
 * recibe, cuando todavía lo tiene abierto, es lo que más reclamos evita.
 */
function cajaBuscarMail() {
  return cajaMail(
    "Guardá este mail",
    '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
    'line-height:1.6;color:#55506b;">Si más adelante no lo encontrás, entrá a tu correo, ' +
    'tocá la lupa y escribí <strong style="color:#241d3a;">MayoristasYa</strong>. ' +
    "Va a aparecer aunque lo hayas archivado o haya caído en spam o promociones.</p>",
    "#fdf2dd",
    "#c08a2e"
  );
}

function textoBuscarMail() {
  return (
    "GUARDÁ ESTE MAIL\n" +
    "Si más adelante no lo encontrás, entrá a tu correo, tocá la lupa y escribí\n" +
    "MayoristasYa. Va a aparecer aunque lo hayas archivado o haya caído en spam."
  );
}

/**
 * El archivo que se adjunta. Devuelve null (y deja el motivo en el registro)
 * si todavía no cargaste el id, en vez de romper la entrega sin explicación.
 */
function adjuntoDe(pack) {
  var id = String(pack.archivoId || "");
  if (!id || id.indexOf("PEGA_EL_ID") === 0) {
    console.error(
      "El pack '" + pack.nombre + "' no tiene archivo cargado. Subí el PDF a tu Drive " +
      "y pegá su id en PACKS, arriba de todo. Mientras tanto, mandáselo a mano."
    );
    return null;
  }
  try {
    var file = DriveApp.getFileById(id);
    return file.getAs(file.getMimeType());
  } catch (err) {
    console.error("No pude abrir el archivo de '" + pack.nombre + "' (id " + id + "): " + err);
    return null;
  }
}

/**
 * Arma el mail que corresponde a ese pack. Devuelve las opciones listas para
 * enviarMail(), o null si el pack no se reconoce.
 *
 * Está separado del envío porque lo usan dos caminos: la entrega automática
 * cuando se aprueba el pago, y el envío a mano desde el panel.
 */
function armarMailPack(nombre, email, pedido, ref, ficha) {
  var pack = buscarPackPorNombre(pedido);
  if (!pack) return null;

  /* El primer nombre solo: "Hola Lautaro" suena mejor que el nombre completo */
  var primerNombre = String(nombre).trim().split(/\s+/)[0] || "";

  var opciones = {
    to: email,
    subject: EMAIL_SUBJECT,
    name: EMAIL_REMITENTE
  };

  if (EMAIL_RESPUESTAS) opciones.replyTo = EMAIL_RESPUESTAS;

  /* Las filas viejas no tienen "tipo": lo deducimos como antes */
  var tipo = pack.tipo || (pack.archivoId ? "proveedores" : "servicio");

  if (tipo === "ebook") {
    /* ---------- El libro: va adjunto, pero no es una lista de contactos ---------- */
    var libro = adjuntoDe(pack);
    if (!libro) return null;

    opciones.subject = "Tu ebook “" + pack.nombre + "” ya está acá - MayoristasYa";
    opciones.attachments = [libro];

    var cuerpoEb =
      pMail("Acá tenés <strong>" + pack.nombre + "</strong>, adjunto a este mail. Son " +
        "17 capítulos ordenados como un camino: cada uno te deja listo para el siguiente.") +
      cajaMail(
        "Cómo leerlo",
        '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
        'line-height:1.7;color:#55506b;">' +
        "<strong>1.</strong> La primera vez, leelo en orden del 1 al 17.<br>" +
        "<strong>2.</strong> Después volvé al capítulo que necesites, como consulta.<br>" +
        "<strong>3.</strong> No lo termines sin hacer el plan de 90 días del final.<br>" +
        "<strong>4.</strong> Ese plan es lo que convierte la lectura en un negocio." +
        "</p>",
        "#f7f5fc",
        "#6d4bd8"
      ) +
      pMail("Dentro vas a encontrar cómo validar qué vender, cómo negociar con proveedores, " +
        "cómo poner precios que dejen margen, el monotributo, MercadoLibre, las redes, " +
        "y los errores que hunden a la mayoría.") +
      cajaBuscarMail() +
      '<div style="margin:24px 0 8px;">' +
      botonMail(
        "Escribinos por WhatsApp",
        wspLink(
          "5491128520849",
          "Hola! Compré el ebook " + pack.nombre + (ref ? " (orden " + ref + ")" : "") + " y tengo una consulta."
        ),
        "#2e7d50"
      ) +
      "</div>" +
      pieOrdenHtml(pedido, ref);

    opciones.htmlBody = plantillaMail(
      "¡Gracias por tu compra, " + escaparHtml(primerNombre) + "!",
      "Tu ebook está adjunto, listo para descargar.",
      cuerpoEb
    );

    opciones.body =
      "Hola " + primerNombre + "!\n\n" +
      "Acá tenés " + pack.nombre + ", adjunto a este mail. Son 17 capítulos ordenados " +
      "como un camino: cada uno te deja listo para el siguiente.\n\n" +
      "CÓMO LEERLO\n" +
      "1. La primera vez, leelo en orden del 1 al 17.\n" +
      "2. Después volvé al capítulo que necesites, como consulta.\n" +
      "3. No lo termines sin hacer el plan de 90 días del final.\n" +
      "4. Ese plan es lo que convierte la lectura en un negocio.\n\n" +
      textoBuscarMail() + "\n\n" +
      "Cualquier duda, escribinos por WhatsApp al 11 2852-0849.\n\n" +
      pieOrdenTexto(pedido, ref) + "\n\n" +
      "Saludos,\nEquipo MayoristasYa";

  } else if (tipo === "proveedores") {
    /* ---------- Packs de proveedores: va el PDF adjunto ---------- */
    var adjunto = adjuntoDe(pack);
    if (!adjunto) return null;

    opciones.subject = "Tu " + pack.nombre + " ya está acá - MayoristasYa";
    opciones.attachments = [adjunto];

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
      cajaBuscarMail() +
      '<div style="margin:24px 0 8px;">' +
      botonMail(
        "Escribinos por WhatsApp",
        wspLink(
          "5491128520849",
          "Hola! Compré el " + pack.nombre + (ref ? " (orden " + ref + ")" : "") + " y tengo una consulta."
        ),
        "#2e7d50"
      ) +
      "</div>" +
      pieOrdenHtml(pedido, ref);

    opciones.htmlBody = plantillaMail(
      "¡Gracias por tu compra, " + escaparHtml(primerNombre) + "!",
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
      textoBuscarMail() + "\n\n" +
      "Cualquier duda, escribinos por WhatsApp al 11 2852-0849.\n\n" +
      pieOrdenTexto(pedido, ref) + "\n\n" +
      "Saludos,\nEquipo MayoristasYa";

  } else if (tipo === "publicidad") {
    /* ---------- Publicidad: hay que pedirle los datos a publicar ---------- */
    opciones.subject = "Tu Espacio Publicitario está reservado - MayoristasYa";

    var wspPub = wspLink(
      TEL_PERSONAL_WSP,
      "Hola Lautaro! Compré el Espacio Publicitario (orden " + (ref || pedido) +
        ") y te paso los datos de mi negocio."
    );

    /* Si llenó el formulario del checkout ya tengo todo: no tiene sentido
       pedirle otra vez los mismos datos. */
    var marcaPub = valorDeFicha(ficha, "Nombre del negocio");

    if (marcaPub) {
      opciones.subject = "Tu anuncio de " + marcaPub + " ya está en camino - MayoristasYa";

      var cuerpoListo =
        pMail("Tu espacio ya está pago y <strong>tengo todos los datos</strong>: los " +
          "dejaste escritos en la compra. No tenés que mandarme nada más.") +
        cajaMail(
          "Esto es lo que va a salir",
          '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
          'line-height:1.8;color:#55506b;">' +
          escaparHtml(ficha).replace(/\n/g, "<br>") +
          "</p>",
          "#f7f5fc",
          "#6d4bd8"
        ) +
        cajaMail(
          "Cuándo lo vas a ver",
          '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
          'line-height:1.6;color:#55506b;">Lo dejo publicado <strong>en el día</strong>. ' +
          "Cuando esté arriba te aviso. Si querés cambiar algo del texto, escribime a " +
          '<strong style="color:#241d3a;font-size:16px;">' + TEL_PERSONAL + "</strong>.</p>",
          "#e3f5ec",
          "#2e7d50"
        ) +
        '<div style="margin:24px 0 8px;">' +
        botonMail("Escribirle a Lautaro", wspPub, "#2e7d50") +
        "</div>" +
        pieOrdenHtml(pedido, ref);

      opciones.htmlBody = plantillaMail(
        "¡Listo, " + escaparHtml(primerNombre) + "!",
        "El anuncio de " + escaparHtml(marcaPub) + " sale hoy.",
        cuerpoListo
      );

      opciones.body =
        "Hola " + primerNombre + "!\n\n" +
        "Tu espacio ya está pago y tengo todos los datos: los dejaste escritos en la " +
        "compra. No tenés que mandarme nada más.\n\n" +
        "ESTO ES LO QUE VA A SALIR\n" + ficha + "\n\n" +
        "CUÁNDO LO VAS A VER\n" +
        "Lo dejo publicado en el día y te aviso cuando esté arriba. Si querés cambiar " +
        "algo del texto, escribime al " + TEL_PERSONAL + ".\n\n" +
        pieOrdenTexto(pedido, ref) + "\n\n" +
        "Saludos,\nLautaro - MayoristasYa";

      return opciones;
    }

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
      pieOrdenHtml(pedido, ref);

    opciones.htmlBody = plantillaMail(
      "¡Listo, " + escaparHtml(primerNombre) + "! Tu espacio está reservado",
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
      pieOrdenTexto(pedido, ref) + "\n\n" +
      "Saludos,\nLautaro - MayoristasYa";

  } else {
    /* ---------- Negocio Mayorista: arranca un proyecto, no un archivo ---------- */
    opciones.subject = "Arrancamos tu Negocio Mayorista - MayoristasYa";

    var wspNeg = wspLink(
      TEL_PERSONAL_WSP,
      "Hola Lautaro! Compré el Negocio Mayorista (orden " + (ref || pedido) +
        ") y quiero arrancar con mi página."
    );

    /* Si contestó la ficha en el checkout, el mail se lo devolvemos con sus
       propias respuestas: llega un "ya empezamos con TU página", no un
       texto igual para todos. */
    var marca = valorDeFicha(ficha, "Nombre del negocio");
    var redesNeg = valorDeFicha(ficha, "Redes que quiere");
    var dominioNeg = valorDeFicha(ficha, "Dominio que quiere");

    if (marca) {
      opciones.subject = "Arrancamos " + marca + " - MayoristasYa";
    }

    var cuerpoNeg =
      pMail(marca
        ? "Gracias por confiar. Ya tengo tus respuestas y arranco con <strong>" +
          escaparHtml(marca) + "</strong>: tu marca, tus colores y los 3 packs de " +
          "proveedores adentro, lista para que vendas."
        : "Gracias por confiar. A partir de acá armamos tu propia página, con tu marca " +
          "y los 3 packs de proveedores adentro, lista para que vendas.") +
      (ficha
        ? cajaMail(
            "Esto es lo que me pediste",
            '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
            'line-height:1.8;color:#55506b;">' +
            (marca ? "<strong>Nombre:</strong> " + escaparHtml(marca) + "<br>" : "") +
            (dominioNeg ? "<strong>Dominio:</strong> " + escaparHtml(dominioNeg) + "<br>" : "") +
            (redesNeg ? "<strong>Redes:</strong> " + escaparHtml(redesNeg) + "<br>" : "") +
            "Si algo de esto lo querés cambiar, avisame ahora que todavía no empecé." +
            "</p>",
            "#e3f5ec",
            "#2e7d50"
          )
        : "") +
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
      pieOrdenHtml(pedido, ref);

    opciones.htmlBody = plantillaMail(
      "¡Arrancamos, " + escaparHtml(primerNombre) + "!",
      marca ? "Ya empecé con " + escaparHtml(marca) + "." : "Tu Negocio Mayorista ya está en marcha.",
      cuerpoNeg
    );

    opciones.body =
      "Hola " + primerNombre + "!\n\n" +
      (marca
        ? "Gracias por confiar. Ya tengo tus respuestas y arranco con " + marca + ": tu marca, " +
          "tus colores y los 3 packs de proveedores adentro, lista para que vendas.\n\n" +
          "ESTO ES LO QUE ME PEDISTE\n" + ficha + "\n" +
          "Si algo lo querés cambiar, avisame ahora que todavía no empecé.\n\n"
        : "Gracias por confiar. A partir de acá armamos tu propia página, con tu marca y " +
          "los 3 packs de proveedores adentro, lista para que vendas.\n\n") +
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
      pieOrdenTexto(pedido, ref) + "\n\n" +
      "Saludos,\nLautaro - MayoristasYa";
  }

  return opciones;
}

/** Manda el mail con el pack que corresponda y marca la fila como enviada. */
function entregarPack(sheet, row) {
  var nombre = sheet.getRange(row, COL_NOMBRE).getValue();
  var email = sheet.getRange(row, COL_EMAIL).getValue();
  var pedido = sheet.getRange(row, COL_PEDIDO).getValue();
  var total = sheet.getRange(row, COL_TOTAL).getValue();
  var ref = String(sheet.getRange(row, COL_REF).getValue() || "");
  var ficha = String(sheet.getRange(row, COL_FICHA).getValue() || "").trim();

  /* Las filas viejas no tienen número de orden: le ponemos uno ahora, así
     todo lo que sale por mail se puede rastrear. */
  if (!ref) {
    ref = nuevaRef("ORD", "");
    sheet.getRange(row, COL_REF).setValue(ref);
  }

  var opciones = armarMailPack(nombre, email, pedido, ref, ficha);
  if (!opciones) {
    console.error("No reconozco el pedido '" + pedido + "'. Fila " + row + " sin enviar.");
    return;
  }

  enviarMail(opciones);

  sheet.getRange(row, COL_ENVIADO).setValue(true);
  invalidarPanel();

  if (EMAIL_ADMIN) {
    enviarMail({
      to: EMAIL_ADMIN,
      subject: "Venta confirmada: " + pedido + " · " + ref,
      name: EMAIL_REMITENTE,
      body:
        "Orden N.º: " + ref + "\n" +
        "Pedido: " + pedido + "\n" +
        "Monto: " + total + "\n" +
        "Comprador: " + nombre + "\n" +
        "Email: " + email + "\n" +
        "Fila en la planilla: " + row + "\n\n" +
        "Ya se le envió el mail de entrega."
    });
  }

  /* Negocio Mayorista y Espacio Publicitario: además del aviso de venta te
     llega la ficha con todo lo que dejó escrito, lista para trabajar. */
  if (ficha) avisarFichaArmado(nombre, email, ref, ficha, pedido);
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
  invalidarPanel(); // cualquier cambio a mano en Pedidos se ve en el panel
  if (e.range.getRow() === 1) return;
  if (e.range.getColumn() !== COL_PAGADO) return;
  if (e.value !== "TRUE") return;

  var row = e.range.getRow();
  if (sheet.getRange(row, COL_ENVIADO).getValue() === true) return;

  entregarPack(sheet, row);
}

/* ====================== PANEL DE VENTAS (panel/index.html) ====================== */

/**
 * El panel es una página estática en GitHub Pages: cualquiera con el link la
 * puede abrir. Lo que la hace privada es esto: los datos solo salen si la
 * clave coincide con PANEL_CLAVE, que vive en las Propiedades del script y
 * nunca en el sitio ni en el repositorio.
 *
 * Además manda lo mínimo para las métricas: primer nombre, pack, monto, fecha
 * y estado. Nada de mails ni apellidos. Si la clave se llegara a filtrar, lo
 * expuesto es poco, y se invalida corriendo generarClavePanel() de nuevo.
 */
/* La versión va en el nombre: al cambiar lo que responde el panel, la caché
   vieja (que no traía los packs) se descarta sola en vez de servir de más. */
var PANEL_CACHE = "panel_v2";
var PANEL_CACHE_SEG = 30;
var PANEL_MAX_FILAS = 3000;

/**
 * CORRÉ ESTA FUNCIÓN UNA VEZ desde el editor: elegila en la lista de arriba y
 * tocá "Ejecutar". Crea una clave, la guarda en las Propiedades del script y
 * la muestra en el "Registro de ejecución" para que la pegues en el panel.
 *
 * Si la volvés a correr, la clave anterior deja de funcionar en todos lados
 * (sirve si perdiste el celular o se la pasaste a alguien sin querer).
 */
function generarClavePanel() {
  var clave = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty("PANEL_CLAVE", clave);
  invalidarPanel();
  console.log("Clave del panel (copiala entera y no la compartas): " + clave);
  return clave;
}

/**
 * Devuelve null si la clave sirve, o el motivo del rechazo.
 * Lo usan las tres entradas del panel: mirar, enviar y reenviar.
 */
function panelClaveOk(clave) {
  var guardada = PropertiesService.getScriptProperties().getProperty("PANEL_CLAVE");
  if (!guardada) return "sin_configurar";
  if (typeof clave !== "string" || clave !== guardada) return "clave";
  return null;
}

/** La lista de packs, para que el panel arme el desplegable de envío. */
function packsPanel() {
  var ids = Object.keys(PACKS), out = [];
  for (var i = 0; i < ids.length; i++) {
    var p = PACKS[ids[i]];
    var id = String(p.archivoId || "");
    out.push({
      id: ids[i],
      nombre: p.nombre,
      precio: p.precio,
      tipo: p.tipo || (p.archivoId ? "proveedores" : "servicio"),
      /* false también cuando el id quedó sin completar: el panel lo avisa
         antes de que le mandes un mail vacío a un cliente */
      archivo: !!id && id.indexOf("PEGA_EL_ID") !== 0
    });
  }
  return out;
}

/** Responde los pedidos al panel, solo si la clave es la correcta. */
function panelDatos(clave) {
  var motivo = panelClaveOk(clave);
  if (motivo) return jsonRespuesta({ ok: false, error: motivo });

  /* La caché evita leer la planilla en cada consulta: aunque tengas el panel
     abierto en la compu y en el celular a la vez, se lee como mucho una vez
     cada 30 segundos. Cuando entra o cambia un pedido se borra al instante
     (ver invalidarPanel), así que una venta nueva no espera a que venza. */
  var cache = CacheService.getScriptCache();
  var enCache = cache.get(PANEL_CACHE);
  if (enCache) {
    return ContentService.createTextOutput(enCache).setMimeType(ContentService.MimeType.JSON);
  }

  var json = JSON.stringify({
    ok: true,
    generado: Date.now(),
    packs: packsPanel(),
    pedidos: leerPedidosPanel()
  });
  try {
    cache.put(PANEL_CACHE, json, PANEL_CACHE_SEG);
  } catch (err) {
    /* Más de 100 KB no entra en la caché: se sirve igual, sin guardarlo */
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function leerPedidosPanel() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  var ultima = sheet.getLastRow();
  if (ultima < 2) return [];

  var desde = Math.max(2, ultima - PANEL_MAX_FILAS + 1);
  var filas = sheet.getRange(desde, 1, ultima - desde + 1, COL_REF).getValues();
  var pedidos = [];

  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    var fecha = fechaPanel(f[COL_FECHA - 1]);
    var nombrePack = String(f[COL_PEDIDO - 1] || "").trim();
    if (!fecha || !nombrePack) continue;

    pedidos.push({
      t: fecha.getTime(),
      p: nombrePack,
      m: montoPanel(f[COL_TOTAL - 1], buscarPackPorNombre(nombrePack)),
      pg: esVerdaderoPanel(f[COL_PAGADO - 1]),
      en: esVerdaderoPanel(f[COL_ENVIADO - 1]),
      n: primerNombrePanel(f[COL_NOMBRE - 1]),
      r: String(f[COL_REF - 1] || "")
    });
  }
  return pedidos;
}

function fechaPanel(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return isNaN(v.getTime()) ? null : v;
  }
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function esVerdaderoPanel(v) {
  return v === true || String(v).trim().toUpperCase() === "TRUE";
}

/* Los pedidos de Mercado Pago guardan un número. Si alguien cargó una fila a
   mano como "$14.999" o "14999,00" también se entiende; y si no hay nada,
   se usa el precio del pack. */
function montoPanel(v, pack) {
  if (typeof v === "number" && v > 0) return Math.round(v);
  var s = String(v || "").trim().replace(/[.,]\d{1,2}$/, "").replace(/\D/g, "");
  if (s) return Number(s);
  return pack ? pack.precio : 0;
}

function primerNombrePanel(v) {
  var n = String(v || "").trim().split(/\s+/)[0] || "";
  return n.charAt(0).toUpperCase() + n.slice(1, 30).toLowerCase();
}

/** Borra la caché del panel para que el próximo pedido lea la planilla. */
function invalidarPanel() {
  try {
    CacheService.getScriptCache().remove(PANEL_CACHE);
  } catch (err) {
    /* si la caché falla no vale romper una venta */
  }
}

function jsonRespuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/* ====================== ENVIAR A MANO DESDE EL PANEL ======================
 *
 * Dos cosas distintas:
 *
 *   enviar   → le mandás el pack que elijas a quien quieras. Sirve para una
 *              venta que cobraste por transferencia, para un regalo, o para
 *              alguien que te compró por WhatsApp. Queda anotado en la
 *              planilla con número de orden que empieza en ENV-.
 *
 *   reenviar → le volvés a mandar el mismo mail a un pedido que YA está en la
 *              planilla, por ejemplo si se le perdió o le cayó en spam. No
 *              crea una fila nueva ni cambia el monto.
 *
 * OJO CON EL LÍMITE DE GMAIL: una cuenta común manda 100 mails por día (las de
 * Google Workspace, 1500). El pack va adjunto, así que cada envío cuenta uno.
 */

/** Tapa el mail para el panel: l••••@gmail.com */
function ocultarEmail(email) {
  var s = String(email || "");
  var arroba = s.indexOf("@");
  if (arroba < 1) return "";
  return s.charAt(0) + "••••" + s.slice(arroba);
}

function emailValido(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

/** Envío nuevo: elegís pack, nombre y correo. */
function panelEnviar(body) {
  var motivo = panelClaveOk(body.clave);
  if (motivo) return jsonRespuesta({ ok: false, error: motivo });

  var pack = PACKS[String(body.pack || "").trim()];
  if (!pack) return jsonRespuesta({ ok: false, error: "pack" });

  var nombre = String(body.nombre || "").trim().slice(0, 80);
  var email = String(body.email || "").trim().slice(0, 120);
  if (nombre.length < 2) return jsonRespuesta({ ok: false, error: "nombre" });
  if (!emailValido(email)) return jsonRespuesta({ ok: false, error: "email" });

  /* Monto 0 = regalo: se manda igual y en el panel no suma plata */
  var monto = Number(body.monto);
  if (!isFinite(monto) || monto < 0) monto = pack.precio;
  monto = Math.min(Math.round(monto), 99999999);

  var anotar = body.anotar !== false;
  var ref = nuevaRef("ENV", "");

  var opciones = armarMailPack(nombre, email, pack.nombre, ref);
  if (!opciones) return jsonRespuesta({ ok: false, error: "pack" });

  try {
    enviarMail(opciones);
  } catch (err) {
    console.error("No pude enviar a " + email + ": " + err);
    return jsonRespuesta({ ok: false, error: "envio", detalle: String(err).slice(0, 180) });
  }

  if (anotar) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.appendRow([
      new Date(), nombre, email, pack.nombre, monto, true, true, ref, "Enviado desde el panel"
    ]);
    invalidarPanel();
  }

  return jsonRespuesta({
    ok: true,
    ref: ref,
    pack: pack.nombre,
    email: ocultarEmail(email),
    anotado: anotar
  });
}

/** Vuelve a mandar el mail de un pedido que ya está en la planilla. */
function panelReenviar(body) {
  var motivo = panelClaveOk(body.clave);
  if (motivo) return jsonRespuesta({ ok: false, error: motivo });

  var ref = String(body.ref || "").trim().slice(0, 80);
  if (!ref) return jsonRespuesta({ ok: false, error: "ref" });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var row = buscarFilaPorRef(sheet, ref);
  if (!row) return jsonRespuesta({ ok: false, error: "no_esta" });

  var nombre = sheet.getRange(row, COL_NOMBRE).getValue();
  var pedido = sheet.getRange(row, COL_PEDIDO).getValue();
  var email = String(sheet.getRange(row, COL_EMAIL).getValue() || "").trim();

  /* Si el comprador se equivocó al escribir su mail, podés corregirlo acá */
  var otro = String(body.email || "").trim();
  if (otro) {
    if (!emailValido(otro)) return jsonRespuesta({ ok: false, error: "email" });
    email = otro.slice(0, 120);
    sheet.getRange(row, COL_EMAIL).setValue(email);
  }
  if (!emailValido(email)) return jsonRespuesta({ ok: false, error: "email" });

  var opciones = armarMailPack(nombre, email, pedido, ref);
  if (!opciones) return jsonRespuesta({ ok: false, error: "pack" });

  try {
    enviarMail(opciones);
  } catch (err) {
    console.error("No pude reenviar " + ref + ": " + err);
    return jsonRespuesta({ ok: false, error: "envio", detalle: String(err).slice(0, 180) });
  }

  /* Marcamos "Enviado", pero NO tocamos "Pagado": si todavía no cobraste, el
     panel tiene que seguir mostrándolo como pendiente. */
  sheet.getRange(row, COL_ENVIADO).setValue(true);
  invalidarPanel();

  return jsonRespuesta({ ok: true, ref: ref, pack: String(pedido), email: ocultarEmail(email) });
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

/**
 * Anota el pedido en la planilla y devuelve su número de orden.
 *
 * SI VIENE UN TOKEN, EL PEDIDO SE ANOTA UNA SOLA VEZ. El navegador genera ese
 * token al tocar "Pagar" y lo repite en los dos envíos del formulario. Antes
 * no existía y el plan B de js/pagos.js dejaba la compra duplicada en la
 * planilla: dos filas para una sola persona.
 */
function registrarPedido(nombre, email, pedido, total, ref, token, ficha) {
  var lock = LockService.getScriptLock();
  var conLock = false;
  try {
    lock.waitLock(20000);
    conLock = true;
  } catch (err) {
    /* Si no se pudo tomar, seguimos igual: perder una venta es peor */
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (token) {
      var yaEsta = buscarFilaPorToken(sheet, token);
      if (yaEsta) return String(sheet.getRange(yaEsta, COL_REF).getValue());
    }

    if (!ref) ref = nuevaRef("ORD", token);
    sheet.appendRow([new Date(), nombre, email, pedido, total, false, false, ref, "", fichaATexto(ficha)]);
    invalidarPanel();
    return ref;
  } finally {
    if (conLock) lock.releaseLock();
  }
}

/** Número de orden: ORD-20260914-153012-a7f3c9 (o ENV- si lo mandaste vos). */
function nuevaRef(prefijo, token) {
  var sello = Utilities.formatDate(new Date(), "GMT-3", "yyyyMMdd-HHmmss");
  return prefijo + "-" + sello + "-" + (token || Math.floor(Math.random() * 900 + 100));
}

/** El token viene del navegador: solo letras y números, y corto. */
function limpiarToken(v) {
  return String(v || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
}

/* ====================== LA FICHA DE ARMADO ======================
   Solo Negocio Mayorista la manda: es lo que el comprador respondió en el
   checkout sobre cómo quiere su página. Viene del navegador, así que se
   trata como texto de afuera: se aceptan únicamente estos campos, se
   recortan a un largo razonable y se limpian los caracteres de control.  */

var CAMPOS_FICHA = [
  { clave: "nombre", titulo: "Nombre del negocio", tope: 40 },
  { clave: "rubro", titulo: "Rubro", tope: 24 },
  { clave: "frase", titulo: "Frase del anuncio", tope: 80 },
  { clave: "wsp", titulo: "WhatsApp", tope: 25 },
  { clave: "web", titulo: "Web", tope: 60 },
  { clave: "instagram", titulo: "Instagram", tope: 40 },
  { clave: "tiktok", titulo: "TikTok", tope: 40 },
  { clave: "dominio", titulo: "Dominio que quiere", tope: 60 },
  { clave: "redes", titulo: "Redes que quiere", tope: 80 },
  { clave: "color", titulo: "Color de la marca", tope: 30 },
  { clave: "logo", titulo: "Logo", tope: 30 },
  { clave: "notas", titulo: "Lo que agregó", tope: 500 }
];

/** Saca los caracteres invisibles. Sin expresiones regulares con escapes:
    es el mismo trabajo y no hay forma de que se escriban mal. */
function sinControles(texto, dejarSaltos) {
  var salida = "";
  for (var i = 0; i < texto.length; i++) {
    var codigo = texto.charCodeAt(i);
    if (codigo === 10 && dejarSaltos) {
      salida += String.fromCharCode(10);
    } else if (codigo < 32 || codigo === 127) {
      salida += " ";
    } else {
      salida += texto.charAt(i);
    }
  }
  return salida;
}

/** Del JSON que manda el formulario a un objeto con solo lo esperado. */
function limpiarFicha(crudo) {
  if (!crudo) return null;

  var datos;
  try {
    datos = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
  } catch (err) {
    return null;
  }
  if (!datos || typeof datos !== "object") return null;

  var limpia = {};
  var hayAlgo = false;

  CAMPOS_FICHA.forEach(function (campo) {
    var v = datos[campo.clave];
    if (v === null || v === undefined) return;
    /* Los caracteres de control son invisibles y ensucian la planilla.
       En "notas" se deja pasar el salto de linea, que ahi si tiene sentido. */
    var texto = sinControles(String(v), campo.clave === "notas")
      .trim()
      .slice(0, campo.tope);
    if (!texto) return;
    limpia[campo.clave] = texto;
    hayAlgo = true;
  });

  return hayAlgo ? limpia : null;
}

/**
 * Saca un dato de la ficha ya guardada, buscándolo por su título.
 * Los renglones son "Nombre del negocio: Mayorista del Sur".
 */
function valorDeFicha(fichaTexto, titulo) {
  if (!fichaTexto) return "";
  var lineas = String(fichaTexto).split("\n");
  var busca = titulo + ": ";
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].indexOf(busca) === 0) return lineas[i].slice(busca.length).trim();
  }
  return "";
}

/** La ficha como texto, que es lo que se guarda en la planilla. */
function fichaATexto(ficha) {
  var limpia = limpiarFicha(ficha);
  if (!limpia) return "";

  var lineas = [];
  CAMPOS_FICHA.forEach(function (campo) {
    if (limpia[campo.clave]) lineas.push(campo.titulo + ": " + limpia[campo.clave]);
  });
  return lineas.join("\n");
}

/**
 * Te manda a vos la ficha, apenas se confirma la venta. Llega aparte del
 * aviso de "venta confirmada" para que no se mezcle: esta es la que abrís
 * cuando te sentás a armarle la página.
 */
function avisarFichaArmado(nombre, email, ref, fichaTexto, pedido) {
  if (!EMAIL_ADMIN || !fichaTexto) return;

  /* Los dos productos que traen ficha piden cosas distintas y se resuelven
     distinto, así que el aviso también cambia. */
  var esAnuncio = String(pedido || "").indexOf("Publicitario") > -1;
  var titulo = esAnuncio ? "Tenés un anuncio para publicar" : "Tenés una página para armar";
  var asunto = esAnuncio ? "Datos del anuncio: " : "Ficha de armado: ";
  var queHizo = esAnuncio
    ? " compró el Espacio Publicitario y dejó escrito su anuncio. Esto es lo que puso:"
    : " compró el Negocio Mayorista y dejó contestado cómo quiere su página. Esto es lo que puso:";
  var pasos = esAnuncio
    ? "<strong>1.</strong> Cargalo en la lista de anunciantes de js/main.js.<br>" +
      "<strong>2.</strong> Revisá que la frase entre en dos renglones.<br>" +
      "<strong>3.</strong> Avisale a " + escaparHtml(email) + " cuando esté arriba."
    : "<strong>1.</strong> Fijate si el dominio está libre.<br>" +
      "<strong>2.</strong> Escribile a " + escaparHtml(email) + " o por WhatsApp.<br>" +
      "<strong>3.</strong> Confirmale el nombre y el color antes de arrancar.";
  var pasosTexto = esAnuncio
    ? "1. Cargalo en la lista de anunciantes de js/main.js.\n" +
      "2. Revisá que la frase entre en dos renglones.\n" +
      "3. Avisale cuando esté arriba."
    : "1. Fijate si el dominio está libre.\n" +
      "2. Escribile y confirmale el nombre y el color.\n" +
      "3. Recién ahí arrancá con la página.";

  /* Cada renglón es "Título: valor". Se parte en el PRIMER dos puntos: si el
     comprador escribió otro adentro de su texto, queda donde corresponde. */
  var filas = fichaTexto.split("\n").map(function (linea) {
    var corte = linea.indexOf(": ");
    if (corte === -1) return { titulo: "", valor: linea };
    return { titulo: linea.slice(0, corte), valor: linea.slice(corte + 2) };
  });

  var htmlFilas = filas.map(function (f) {
    return (
      '<tr>' +
      '<td style="padding:9px 12px;border-bottom:1px solid #eceaf4;' +
      'font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#8a84a3;' +
      'white-space:nowrap;vertical-align:top;">' + escaparHtml(f.titulo) + "</td>" +
      '<td style="padding:9px 12px;border-bottom:1px solid #eceaf4;' +
      'font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#241d3a;' +
      'font-weight:700;">' + escaparHtml(f.valor).replace(/\n/g, "<br>") + "</td>" +
      "</tr>"
    );
  }).join("");

  var cuerpo =
    pMail("<strong>" + escaparHtml(nombre) + "</strong>" + queHizo) +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
    'style="border-collapse:collapse;background:#ffffff;border-radius:12px;' +
    'overflow:hidden;margin:18px 0;">' + htmlFilas + "</table>" +
    cajaMail(
      "Lo primero",
      '<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;' +
      'line-height:1.7;color:#55506b;">' + pasos + "</p>",
      "#f7f5fc",
      "#6d4bd8"
    ) +
    pieOrdenHtml(pedido || "Negocio Mayorista", ref);

  enviarMail({
    to: EMAIL_ADMIN,
    subject: asunto + nombre + " · " + ref,
    name: EMAIL_REMITENTE,
    replyTo: email,
    htmlBody: plantillaMail(titulo, nombre + " ya dejó todo lo que hace falta.", cuerpo),
    body:
      nombre + queHizo.replace(" Esto es lo que puso:", "") + "\n\n" +
      fichaTexto + "\n\n" +
      "Contacto: " + email + "\n" +
      "Orden: " + ref + "\n\n" +
      "LO PRIMERO\n" + pasosTexto
  });
}

function buscarFilaPorRef(sheet, ref) {
  return buscarEnRefs(sheet, function (r) { return r === String(ref); });
}

/** El token es el final del número de orden, después del último guión. */
function buscarFilaPorToken(sheet, token) {
  var fin = "-" + token;
  return buscarEnRefs(sheet, function (r) {
    return r.length > fin.length && r.slice(-fin.length) === fin;
  });
}

/* De abajo hacia arriba: lo más nuevo está al final de la planilla. */
function buscarEnRefs(sheet, coincide) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return null;
  var refs = sheet.getRange(2, COL_REF, ultima - 1, 1).getValues();
  for (var i = refs.length - 1; i >= 0; i--) {
    if (coincide(String(refs[i][0]))) return i + 2;
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
