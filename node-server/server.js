
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = 3001;

// Ruta HTTP para comprobar que el servidor funciona.
app.get("/", (req, res) => {
  res.json({
    message: "Servidor base de alertas funcionando",
    status: "OK",
  });
});

// Conexión de clientes mediante Socket.IO.
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar el servidor.
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP disponible en el puerto ${PORT}`);
  console.log(`Prueba local: http://localhost:${PORT}`);
});
