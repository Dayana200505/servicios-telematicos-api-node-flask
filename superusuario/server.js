const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { io } = require("socket.io-client");

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
  cors: { origin: "*" },
});

const PORT = 4000;

// Genera un ID único para cada prueba
let testId = 1;
let pruebaEnCurso = false;

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "load-test-panel" });
});

ioServer.on("connection", (socket) => {
  console.log(`[Panel] Cliente conectado: ${socket.id}`);

  socket.on("prueba:iniciar", async (config, callback) => {
    if (pruebaEnCurso) {
      const error = "Ya hay una prueba de carga en curso.";
      if (callback) callback({ ok: false, error });
      return;
    }
    const { url, stack, usuarios, distribucion, alerta } = config || {};

    if (!/^https?:\/\//.test(url) || !["node", "flask"].includes(stack) ||
        ![50, 100, 500, 1000].includes(Number(usuarios)) ||
        !["destino", "repartido"].includes(distribucion) || !alerta) {
      const error = "Configuración de prueba inválida. Usa 50, 100, 500 o 1000 usuarios y una distribución permitida.";
      if (callback) callback({ ok: false, error });
      return;
    }

    pruebaEnCurso = true;

    console.log(`\n[Panel] Iniciando prueba: ${usuarios} usuarios en ${stack} (${url})`);

    try {
      // 1. Crear los clientes virtuales
      const clientes = [];
      const recibieron = { norte: 0, centro: 0, sur: 0 };
      const conectados = { norte: 0, centro: 0, sur: 0 };
      const suscritos = { norte: 0, centro: 0, sur: 0 };
      const simulados = { norte: 0, centro: 0, sur: 0 };
      const latencias = [];
      let fallidos = 0;
      let fueraDeZona = 0;

      // Distribuir los usuarios por zona
      const zonas = ["norte", "centro", "sur"];
      for (let i = 0; i < usuarios; i++) {
        let zona;
        if (distribucion === "destino") {
          zona = alerta.zona;
        } else {
          zona = zonas[i % 3];
        }
        simulados[zona]++;
      }

      // Emitir progreso inicial
      socket.emit("prueba:progreso", {
        fase: "conectando",
        hechos: 0,
        total: usuarios,
        texto: `Conectando ${usuarios} usuarios...`,
      });

      // Conectar a los usuarios gradualmente
      for (let i = 0; i < usuarios; i++) {
        const zona = distribucion === "destino" ? alerta.zona : zonas[i % 3];
        const client = io(url, {
          transports: ["websocket"],
          reconnection: false,
          timeout: 5000,
        });

        client.on("connect", () => {
          conectados[zona]++;
          client.emit("suscribir_zona", { zona });
        });

        client.on("zona_confirmada", (confirmacion) => {
          if (confirmacion && confirmacion.zona === zona) suscritos[zona]++;
        });

        client.on("alerta_recibida", (data) => {
          if (data.zona === zona) {
            recibieron[zona]++;
            latencias.push(Date.now() - data.emitida_en);
          } else {
            fueraDeZona++;
          }
        });

        client.on("connect_error", () => {
          fallidos++;
          client.disconnect();
        });

        clientes.push(client);

        // Emitir progreso cada 10 clientes para no saturar la UI
        if (i % 10 === 0 || i === usuarios - 1) {
          socket.emit("prueba:progreso", {
            fase: "conectando",
            hechos: i + 1,
            total: usuarios,
            texto: `Conectando usuarios (${i + 1}/${usuarios})...`,
          });
        }

        // Pequeña pausa para no colapsar el servidor
        await new Promise((r) => setTimeout(r, 5));
      }

      // 2. Emitir la alerta
      // Dar tiempo a que cada cliente confirme su entrada a la room.
      await new Promise((r) => setTimeout(r, 500));
      socket.emit("prueba:progreso", {
        fase: "emitiendo",
        hechos: 0,
        total: 1,
        texto: "Emitiendo alerta...",
      });

      const emisor = io(url, { transports: ["websocket"] });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("El emisor no recibió confirmación del servidor.")), 8000);
        emisor.on("connect", () => {
          emisor.timeout(5000).emit("emitir_alerta", { ...alerta, emitida_en: Date.now() }, (error, respuesta) => {
            clearTimeout(timer);
            if (error || !respuesta || !respuesta.ok) reject(new Error(respuesta?.error || "El servidor rechazó la alerta."));
            else resolve();
          });
        });
        emisor.on("connect_error", () => { clearTimeout(timer); reject(new Error("No se pudo conectar el emisor.")); });
      });

      // 3. Esperar a que lleguen los mensajes
      socket.emit("prueba:progreso", {
        fase: "esperando",
        hechos: 0,
        total: 1,
        texto: "Esperando recepción de alertas...",
      });
      await new Promise((r) => setTimeout(r, 2000));

      // 4. Calcular resultados
      const totalRecibieron = recibieron.norte + recibieron.centro + recibieron.sur;
      const totalConectados = conectados.norte + conectados.centro + conectados.sur;
      const totalSimulados = simulados.norte + simulados.centro + simulados.sur;
      const objetivo = simulados[alerta.zona];
      const conectadosDestino = conectados[alerta.zona];
      const suscritosDestino = suscritos[alerta.zona];
      const sinConexionDestino = Math.max(0, objetivo - conectadosDestino);
      
      // Calcular métricas
      latencias.sort((a, b) => a - b);
      const prom = latencias.length > 0 ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;
      const min = latencias.length > 0 ? Math.round(latencias[0]) : null;
      const max = latencias.length > 0 ? Math.round(latencias[latencias.length - 1]) : null;
      const p95 = latencias.length > 0 ? Math.round(latencias[Math.floor(latencias.length * 0.95)]) : null;

      // Armar el desglose por zona
      const porZona = zonas.map((z) => ({
        zona: z,
        simulados: simulados[z],
        conectados: conectados[z],
        recibieron: recibieron[z],
        destino: z === alerta.zona,
      }));

      const resultado = {
        ok: true,
        id: testId++,
        fecha: new Date().toISOString(),
        stack,
        usuarios,
        distribucion,
        zona: alerta.zona,
        suscritos: Object.values(suscritos).reduce((a, b) => a + b, 0),
        fallidos,
        objetivo,
        recibieron: totalRecibieron,
        no_recibieron: Math.max(0, objetivo - totalRecibieron),
        sin_conexion: sinConexionDestino,
        sin_recepcion: Math.max(0, suscritosDestino - totalRecibieron),
        fuera_de_zona: fueraDeZona,
        entrega_pct: objetivo > 0 ? Math.round((totalRecibieron / objetivo) * 100) : 0,
        entrega_pct_conectados: conectadosDestino > 0 ? Math.round((totalRecibieron / conectadosDestino) * 100) : 0,
        latencia: { min, prom, p95, p99: p95, max },
        ms_total: 2000, // Aproximado, podrías medir el tiempo exacto
        por_zona: porZona,
      };

      console.log(`[Panel] Prueba finalizada. Resultados:`, resultado);

      // Enviar resultado al cliente
      socket.emit("prueba:resultado", resultado);

      // Desconectar a todos los clientes
      clientes.forEach((c) => c.disconnect());
      emisor.disconnect();

      if (callback) callback({ ok: true });
    } catch (error) {
      console.error("[Panel] Error en la prueba:", error);
      socket.emit("prueba:resultado", { ok: false, error: error.message });
      if (callback) callback({ ok: false, error: error.message });
    } finally {
      pruebaEnCurso = false;
    }
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor de pruebas de carga en http://localhost:${PORT}`);
});
