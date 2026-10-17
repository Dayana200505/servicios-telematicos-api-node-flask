
const { io } = require("socket.io-client");

// SERVIDOR NODE.JS
const SERVER_URL = "http://localhost:3001";

// SERVIDOR FLASK
//const SERVER_URL = "http://localhost:5000";

const alertas = [
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

  socket.emit("emitir_alerta", alerta);
  indice++;

  // Espera antes de enviar la siguiente alerta.
  temporizador = setTimeout(enviarSiguienteAlerta, 1000);
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
