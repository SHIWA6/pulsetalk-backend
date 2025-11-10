"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const socket_1 = require("./socket/socket");
const cleanup_1 = require("./cleanup");
const port = 8080;
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000", "https://chatpulse.chat"],
    methods: ["GET", "POST"],
    credentials: true,
}));
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://chatpulse.chat"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});
exports.io = io;
// Run scheduled cleanup job
(0, cleanup_1.setupCleanupJob)();
// Start server
server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
// Initialize socket logic
(0, socket_1.setupSocket)(io);
