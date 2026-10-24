
const ExcelJS = require("exceljs");
const { io } = require("socket.io-client");
const fs = require("node:fs");
const path = require("node:path");

const URL = process.argv[2] || "http://localhost:3001";
const ESCENARIOS = [50, 100, 500, 1000];
const TIMEOUT_CONEXION_MS = 8000;
const DURACION_CONEXION_MS = 5000;
const INTERVALO_CREACION_MS = 5;

const resultados = [];

const esperar = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function probarEscenario(cantidad) {
  console.log(`\n--- Escenario: ${cantidad} clientes ---`);
  console.log(`Servidor: ${URL}`);

  let exitosas = 0;
  let fallidas = 0;
  let inesperadas = 0;
  let controladas = 0;
  const tiempos = [];
  const clientes = [];
  const desconexionControlada = new WeakSet();

  const inicio = Date.now();

  async function crearCliente(indice) {
    const inicioConexion = Date.now();

    return new Promise((resolve) => {
      const socket = io(URL, {
        autoConnect: false,
        reconnection: false,
        timeout: TIMEOUT_CONEXION_MS,
      });

      clientes.push(socket);

      let terminado = false;
      let conectado = false;
      let temporizador;

      function terminar(tipo) {
        if (terminado) return;
        terminado = true;
        clearTimeout(temporizador);

        if (tipo === "exito") {
          exitosas++;
          tiempos.push(Date.now() - inicioConexion);
        } else {
          fallidas++;
          socket.disconnect();
        }

        resolve();
      }

      socket.on("connect", () => {
        conectado = true;
        terminar("exito");
      });

      socket.on("connect_error", (error) => {
        if (!conectado) {
          terminar("fallo");
          if (indice < 3) {
            console.log(`Cliente ${indice + 1}: ${error.message}`);
          }
        }
      });

      socket.on("disconnect", (motivo) => {
        if (!conectado) return;
        conectado = false;

        if (desconexionControlada.has(socket)) {
          controladas++;
        } else {
          inesperadas++;
          console.log(`Desconexión inesperada: cliente ${indice + 1} (${motivo})`);
        }
      });

      temporizador = setTimeout(() => {
        if (!terminado) {
          terminar("fallo");
        }
      }, TIMEOUT_CONEXION_MS + 500);

      socket.connect();
    });
  }

  const intentos = [];

  // Crear clientes gradualmente y mantener sus conexiones abiertas.
  for (let i = 0; i < cantidad; i++) {
    intentos.push(crearCliente(i));
    await esperar(INTERVALO_CREACION_MS);
  }

  await Promise.all(intentos);

  console.log(`Solicitados: ${cantidad}`);
  console.log(`Conexiones exitosas: ${exitosas}`);
  console.log(`Conexiones fallidas: ${fallidas}`);
  console.log(
    `Tiempo promedio de conexión: ${
      tiempos.length
        ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2) + " ms"
        : "N/A"
    }`
  );

  console.log(`Manteniendo conexiones por ${DURACION_CONEXION_MS} ms...`);
  await esperar(DURACION_CONEXION_MS);

  for (const socket of clientes) {
    if (socket.connected) {
      desconexionControlada.add(socket);
      socket.disconnect();
    }
  }

  await esperar(300);

  const resultado = {
    fecha: new Date().toISOString(),
    servidor: URL,
    solicitados: cantidad,
    exitosas,
    fallidas,
    desconexiones_inesperadas: inesperadas,
    desconexiones_controladas: controladas,
    promedio_conexion_ms: tiempos.length
      ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2)
      : "",
    duracion_intentos_ms: Date.now() - inicio,
  };

  resultados.push(resultado);
  console.table([resultado]);
}

async function main() {
  try {
    for (const cantidad of ESCENARIOS) {
      await probarEscenario(cantidad);
      await esperar(1500);
    }

    const columnas = Object.keys(resultados[0]);
    const csv = [
      columnas.join(","),
      ...resultados.map((fila) =>
        columnas.map((columna) => fila[columna]).join(",")
      ),
    ].join("\n");

    const archivo = path.join(__dirname, "resultados_carga_node.csv");
    fs.writeFileSync(archivo, csv, "utf8");

    console.log(`\nPrueba terminada. CSV guardado en:\n${archivo}`);
  } catch (error) {
    console.error("Error en la prueba:", error);
    process.exitCode = 1;
  }

  
    // Crear un Excel organizado para revisar los resultados.
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Resultados Node");

    const columnas = Object.keys(resultados[0]);

    hoja.columns = columnas.map((columna) => ({
      header: columna,
      key: columna,
      width: Math.min(
        Math.max(columna.length + 3, 16),
        32
      ),
    }));

    resultados.forEach((resultado) => {
      hoja.addRow(resultado);
    });

    hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    hoja.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF245A81" },
    };

    hoja.getRow(1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    hoja.views = [{ state: "frozen", ySplit: 1 }];
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length },
    };

    const archivoExcel = path.join(
      __dirname,
      "resultados_carga_node.xlsx"
    );

    await libro.xlsx.writeFile(archivoExcel);

    console.log(`Excel organizado guardado en:\n${archivoExcel}`);


}

main();
