const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Message = require("./models/Message");

dotenv.config();

const app = express();

//servir el frontend (index.html) para que el túnel muestre el chat
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

//socket
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  });

io.on("connection", (socket) => {
  socket.on("join-room", async ({ room, userName }) => {
    socket.data.room = room;
    socket.data.name = userName || "Anónimo";
    socket.join(room);
    try {
      const history = await Message.find()
        .sort({ timestamp: 1 })
        .limit(100)
        .lean();
      socket.emit("history", history);
    } catch (err) {
      console.error("Error cargando historial:", err.message);
    }
  });

  socket.on("message", async (message) => {
    try {
      const saved = await Message.create(message);
      io.to(saved.room || "general").emit("messages", saved);
    } catch (err) {
      console.error("Error guardando mensaje:", err.message);
    }
  });

  // ---- Videollamada (WebRTC: solo relé de señales) ----
  socket.on("call:offer", ({ room, fromId, fromName, offer }) => {
    socket.broadcast.to(room || "general").emit("call:offer", {
      fromId,
      fromName,
      offer,
    });
  });

  socket.on("call:answer", ({ targetId, answer }) => {
    io.to(targetId).emit("call:answer", { answer, fromId: socket.id });
  });

  socket.on("call:ice", ({ targetId, candidate }) => {
    io.to(targetId).emit("call:ice", { candidate, fromId: socket.id });
  });

  socket.on("call:hangup", ({ targetId }) => {
    io.to(targetId).emit("call:hangup", { fromId: socket.id });
  });

  socket.on("call:decline", ({ targetId }) => {
    io.to(targetId).emit("call:decline", { fromId: socket.id });
  });

  socket.on("call:cancel", () => {
    socket.broadcast.to(socket.data.room || "general").emit("call:cancel");
  });
});

//inicio del servidor
http.listen(3000, () => {
  console.log("Server Running");
});