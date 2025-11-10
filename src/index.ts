import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import { setupSocket } from "./socket/socket";
import { setupCleanupJob } from "./cleanup";

const port = 8080;
const app = express();
const server = createServer(app);

app.use(cors({
  origin: ["http://localhost:3000", "https://chatpulse.chat"],
  methods: ["GET", "POST"],
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://chatpulse.chat"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Run scheduled cleanup job
setupCleanupJob();

// Start server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

// Initialize socket logic
setupSocket(io);

export { io };
