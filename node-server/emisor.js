const { io } = require("socket.io-client");
const ExcelJS = require("exceljs");
const path = require("path");

const SERVER_URL = process.argv[2] || "http://localhost:3001";
const ZONA_FILTRO = process.argv[3]?.toLowerCase();
const ACK_TIMEOUT_MS = 5000;
const PAUSE_MS = 500;

const alertaBase = {
  tipo: "incendio",
  gravedad: "media",
  zona: "centro",
  mensaje: "Incendio de prueba en la zona centro",
};

const pruebas = [
  {
    nombre: "Alerta válida - centro",
    datos: { ...alertaBase },
    esperado: true,
  },
  {
    nombre: "Alerta válida - norte",
    datos: {
      tipo: "inundacion",
      gravedad: "media",
      zona: "norte",
      mensaje: "Inundacion de prueba en la zona norte",
    },
    esperado: true,
  },
  {
    nombre: "Alerta válida - sur",
    datos: {
      tipo: "temblor",
      gravedad: "baja",
      zona: "sur",
      mensaje: "Temblor de prueba en la zona sur",
    },
    esperado: true,
  },
  {
    nombre: "Mensaje vacío",
    datos: { ...alertaBase, mensaje: "" },
    esperado: false,
  },
  {
    nombre: "Falta campo tipo",
    datos: {
      gravedad: "media",
      zona: "centro",
      mensaje: "Prueba de alerta",
    },
    esperado: false,
  },
  {
    nombre: "Falta campo gravedad",
    datos: {
      tipo: "incendio",
      zona: "centro",
      mensaje: "Prueba de alerta",
    },
    esperado: false,
  },
  {
    nombre: "Falta campo zona",
    datos: {
      tipo: "incendio",
      gravedad: "media",
      mensaje: "Prueba de alerta",
    },
    esperado: false,
  },
  {
    nombre: "Falta campo mensaje",
    datos: {
      tipo: "incendio",
      gravedad: "media",
      zona: "centro",
    },
    esperado: false,
  },
  {
    nombre: "Tipo vacío",
    datos: { ...alertaBase, tipo: "" },
    esperado: false,
  },
  {
    nombre: "Gravedad vacía",
    datos: { ...alertaBase, gravedad: "" },
    esperado: false,
  },
  {
    nombre: "Zona vacía",
    datos: { ...alertaBase, zona: "" },
    esperado: false,
  },
  {
    nombre: "Gravedad inválida",
    datos: { ...alertaBase, gravedad: "extrema" },
    esperado: false,
  },
  {
    nombre: "Zona inválida",
    datos: { ...alertaBase, zona: "este" },
    esperado: false,
  },
  {
    nombre: "Tipo supera 50 caracteres",
    datos: { ...alertaBase, tipo: "t".repeat(51) },
    esperado: false,
  },
  {
    nombre: "Mensaje supera 200 caracteres",
    datos: { ...alertaBase, mensaje: "x".repeat(201) },
    esperado: false,
  },
  {
    nombre: "Mensaje de exactamente 200 caracteres",
    datos: { ...alertaBase, mensaje: "x".repeat(200) },
    esperado: true,
  },
  {
    nombre: "Tipo textual con números",
    datos: { ...alertaBase, tipo: "alerta123" },
    esperado: true,
  },
  {
    nombre: "Tipo no textual",
    datos: { ...alertaBase, tipo: 123 },
    esperado: false,
  },
  {
    nombre: "Gravedad no textual",
    datos: { ...alertaBase, gravedad: 2 },
    esperado: false,
  },
  {
    nombre: "Zona no textual",
    datos: { ...alertaBase, zona: 10 },
    esperado: false,
  },
  {
    nombre: "Mensaje no textual",
    datos: { ...alertaBase, mensaje: 123 },
    esperado: false,
  },
  {
    nombre: "Payload no es objeto",
    datos: "esto no es un objeto de alerta",
    esperado: false,
  },
];

if (
  ZONA_FILTRO &&
  !["norte", "centro", "sur"].includes(ZONA_FILTRO)
) {
  console.error(
    `Zona no válida: ${ZONA_FILTRO}. Usa norte, centro o sur.`
  );
  process.exit(1);
}

const casos = ZONA_FILTRO
  ? pruebas.filter(
      (prueba) =>
        typeof prueba.datos === "string" ||
        prueba.datos.zona === ZONA_FILTRO
    )
  : pruebas;

const resultados = [];

let socket;
let finalizando = false;

function aTexto(valor) {
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

function pausa(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ejecutarCaso(caso) {
  return new Promise((resolve) => {
    let completado = false;
    const inicio = Date.now();

    function finalizar(respuesta, recibioAck) {
      if (completado) return;

      completado = true;
      clearTimeout(timeout);

      const correcto =
        recibioAck &&
        (
          (caso.esperado && respuesta?.ok === true) ||
          (!caso.esperado && respuesta?.ok === false)
        );

      const fila = {
        numero: resultados.length + 1,
        prueba: caso.nombre,
        datosEnviados: aTexto(caso.datos),
        resultadoEsperado: caso.esperado
          ? "Aceptación"
          : "Rechazo",
        respuestaServidor: recibioAck
          ? aTexto(respuesta)
          : "Sin ACK: tiempo de espera agotado",
        estado: correcto ? "CORRECTO" : "FALLIDO",
        duracionMs: Date.now() - inicio,
      };

      resultados.push(fila);

      console.log(`[${fila.estado}] ${caso.nombre}`);
      console.log(`Respuesta: ${fila.respuestaServidor}`);

      resolve();
    }

    const timeout = setTimeout(
      () => finalizar(null, false),
      ACK_TIMEOUT_MS
    );

    socket.emit(
      "emitir_alerta",
      caso.datos,
      (respuesta) => finalizar(respuesta, true)
    );
  });
}

async function generarExcel() {
  const libro = new ExcelJS.Workbook();

  libro.creator = "Pruebas de alertas Node.js";
  libro.created = new Date();

  const hoja = libro.addWorksheet("Resultados");

  hoja.columns = [
    { header: "N.º", key: "numero", width: 8 },
    { header: "Caso de prueba", key: "prueba", width: 38 },
    { header: "Datos enviados", key: "datosEnviados", width: 68 },
    {
      header: "Resultado esperado",
      key: "resultadoEsperado",
      width: 22,
    },
    {
      header: "Respuesta del servidor",
      key: "respuestaServidor",
      width: 58,
    },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Duración (ms)", key: "duracionMs", width: 16 },
  ];

  hoja.addRows(resultados);
  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: "A1", to: "G1" };

  const correctas = resultados.filter(
    (r) => r.estado === "CORRECTO"
  ).length;

  const fallidas = resultados.length - correctas;

  const resumen = libro.addWorksheet("Resumen");

  resumen.addRows([
    ["Resumen de pruebas de alertas - Node.js"],
    ["Servidor", SERVER_URL],
    ["Zona filtrada", ZONA_FILTRO || "Todas"],
    ["Fecha de ejecución", new Date().toLocaleString()],
    ["Total de pruebas", resultados.length],
    ["Correctas", correctas],
    ["Fallidas", fallidas],
    [
      "Resultado general",
      fallidas === 0
        ? "TODAS CORRECTAS"
        : "REVISAR RESULTADOS",
    ],
  ]);

  resumen.getRow(1).font = {
    bold: true,
    size: 14,
  };

  resumen.getColumn(1).width = 30;
  resumen.getColumn(2).width = 42;

  const archivo = path.join(
    __dirname,
    "resultados_Alertas.xlsx"
  );

  await libro.xlsx.writeFile(archivo);

  console.log(`Excel generado: ${archivo}`);
}

async function iniciar() {
  console.log(`Servidor: ${SERVER_URL}`);
  console.log(`Casos seleccionados: ${casos.length}`);

  socket = io(SERVER_URL, {
    reconnection: false,
    timeout: ACK_TIMEOUT_MS,
  });

  socket.on("connect", async () => {
    console.log("Conectado al servidor:", SERVER_URL);
    console.log("ID de conexión:", socket.id);

    for (const caso of casos) {
      await ejecutarCaso(caso);
      await pausa(PAUSE_MS);
    }

    if (finalizando) return;

    finalizando = true;

    try {
      await generarExcel();
    } catch (error) {
      console.error(
        "No se pudo generar el Excel:",
        error.message
      );

      process.exitCode = 1;
    } finally {
      socket.disconnect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("Error de conexión:", error.message);
    process.exitCode = 1;
  });

  socket.on("error_alerta", (datos) => {
    console.error(
      "Evento error_alerta recibido:",
      aTexto(datos)
    );
  });

  socket.on("disconnect", (motivo) => {
    console.log("Desconectado del servidor:", motivo);
  });
}

iniciar().catch((error) => {
  console.error("Error durante las pruebas:", error);
  process.exitCode = 1;
});