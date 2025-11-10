import { Server, Socket } from "socket.io";
import prisma from "../lib/prisma.server";

interface ChatMessageRecord {
  id: string;
  sender: string;
  message: string;
  chatGroupId: string;
  createdAt: Date;
  userEmail: string;
  userAvatar?: string | null;
  userId: string;
}

interface CustomSocket extends Socket {
  room?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderAvatar?: string;
  message: string;
  room: string;
  createdAt: string;
  user: {
    email: string;
    avatar?: string;
  };
}

interface FetchMessagesData {
  room: string;
}

interface SendMessageData {
  sender: string;
  message: string;
  room: string;
  createdAt?: string;
  user: {
    email: string;
    avatar?: string;
  };
}

type FetchMessagesCallback = (messages: ChatMessage[]) => void;

// Format message object
function formatMessage(msg: ChatMessageRecord): ChatMessage {
  return {
    id: msg.id,
    sender: msg.sender,
    senderAvatar: msg.userAvatar || undefined,
    message: msg.message,
    room: msg.chatGroupId,
    createdAt: msg.createdAt.toISOString(),
    user: {
      email: msg.userEmail,
      avatar: msg.userAvatar || undefined,
    },
  };
}

// Fetch messages from database
async function getMessagesForRoom(room: string): Promise<ChatMessage[]> {
  try {
    console.log(`Fetching messages for room: ${room} (from DB)`);
    const messagesFromDB = await prisma.chatMessage.findMany({
      where: { chatGroupId: room },
      orderBy: { createdAt: "asc" },
    });
    return messagesFromDB.map(formatMessage);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

export function setupSocket(io: Server): void {
  io.use((socket: CustomSocket, next) => {
    const room = socket.handshake.auth.room as string | undefined;
    if (room) {
      socket.join(room);
      socket.room = room;
      console.log(`✅ [Middleware] Socket ${socket.id} joined room: ${room}`);
    } else {
      console.warn(`⚠️ [Middleware] Socket ${socket.id} has no room`);
    }
    next();
  });

  io.on("connection", async (socket: CustomSocket) => {
    console.log(`🟢 Socket connected: ${socket.id}, Room: ${socket.room}`);

    // 🟢 Step 1: When a socket connects, send the room info to frontend
    if (socket.room) {
      try {
        const group = await prisma.chatGroup.findUnique({
          where: { id: socket.room },
          select: { title: true },
        });

        // Send the room title to the client
        socket.emit("room_info", { name: group?.title || "Unknown Room" }); // 🟢 Added

        console.log(`📢 Sent room info: ${group?.title}`);
      } catch (err) {
        console.error("❌ Error fetching room info:", err);
      }

      // Send message history
      console.log(
        "Current sockets in room:",
        Array.from(io.sockets.adapter.rooms.get(socket.room) || [])
      );

      getMessagesForRoom(socket.room)
        .then((messages) => socket.emit("fetch_messages", messages))
        .catch((err) => console.error("Error on connection:", err));
    }

    // Fetch message event
    socket.on(
      "fetch_messages",
      async (data: FetchMessagesData, callback: FetchMessagesCallback) => {
        const messages = await getMessagesForRoom(data.room);
        callback(messages);
      }
    );

    // Send message event
    socket.on(
      "send_message",
      async (data: SendMessageData, callback?: (error?: string | null) => void) => {
        console.log(`📩 Received message from ${data.user.email} for room ${data.room}`);

        const userInfo = {
          email: data.user.email || "unknown@example.com",
          avatar: data.user.avatar || null,
        };

        try {
          const user = await prisma.user.findUnique({
            where: { email: userInfo.email },
          });
          if (!user) throw new Error(`User with email ${userInfo.email} not found`);

          const savedMessage = await prisma.chatMessage.create({
            data: {
              chatGroupId: data.room,
              sender: data.sender,
              message: data.message,
              userId: user.id,
              userEmail: userInfo.email,
              userAvatar: userInfo.avatar,
            },
          });

          const formattedMessage = formatMessage(savedMessage);

          // Broadcast message to room
          io.to(data.room).emit("new_message", formattedMessage);
          console.log(`✅ Message broadcast to room: ${data.room}`);

          if (callback) callback(null);
        } catch (error: any) {
          console.error("❌ Error saving message:", error);
          if (callback) callback(error.message || "Failed to send message");
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔴 Disconnected socket: ${socket.id}`);
    });
  });
}

