
const { io } = require("socket.io-client");

const SERVER_URL = process.argv[2] || "http://localhost:3001";
const ZONA_FILTRO = process.argv[3];

const alertasBase = [
  {
    tipo: "incendio",
    gravedad: "media",
    zona: "centro",
    mensaje: "Incendio de prueba en la zona centro",
  },
  {
    tipo: "inundacion",
    gravedad: "media",
    zona: "norte",
    mensaje: "Inundacion de prueba en la zona norte",
  },
  {
    tipo: "temblor",
    gravedad: "baja",
    zona: "sur",
    mensaje: "Temblor de prueba en la zona sur",
  },
];

const alertas = ZONA_FILTRO
  ? alertasBase.filter((alerta) => alerta.zona === ZONA_FILTRO)
  : alertasBase;

if (ZONA_FILTRO && alertas.length === 0) {
  console.error(`No hay alertas de prueba para la zona: ${ZONA_FILTRO}`);
  process.exit(1);
}

const socket = io(SERVER_URL);
let indice = 0;
let temporizador;

socket.on("connect", () => {
  console.log("Conectado al servidor:", SERVER_URL);
  console.log("ID de conexión:", socket.id);

  enviarSiguienteAlerta();
});

function enviarSiguienteAlerta() {
  if (indice >= alertas.length) {
    console.log("Se enviaron todas las alertas de prueba.");

    temporizador = setTimeout(() => {
      socket.disconnect();
    }, 1000);

    return;
  }

  const alerta = alertas[indice];

  console.log(`\nEnviando alerta ${indice + 1}/${alertas.length}:`);
  console.log(JSON.stringify(alerta, null, 2));

  socket.emit("emitir_alerta", alerta, (respuesta) => {
    if (respuesta?.ok) {
      console.log("Servidor acepto la alerta.");
    } else {
      console.error("Servidor rechazo la alerta:", respuesta);
    }

    indice++;
  temporizador = setTimeout(enviarSiguienteAlerta, 1000);
  });
}

socket.on("connect_error", (error) => {
  console.error("Error de conexión:", error.message);
});

socket.on("error_alerta", (data) => {
  console.error("El servidor rechazó una alerta:", data);
});

socket.on("disconnect", () => {
  if (temporizador) clearTimeout(temporizador);
  console.log("Desconectado del servidor.");
});
