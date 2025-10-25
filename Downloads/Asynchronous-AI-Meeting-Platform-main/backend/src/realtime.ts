import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

export function createRealtime(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN?.split(",") || ["*"], credentials: true }
  });

  function emitUpdate(meetingId: string, event: string, payload: unknown) {
    io.to(`meeting:${meetingId}`).emit(event, payload);
  }

  io.on("connection", (socket) => {
    socket.on("join", (meetingId: string) => {
      socket.join(`meeting:${meetingId}`);
    });
  });

  return {
    io,
    emitUpdate,
    broadcastTurn: (meetingId: string, turn: any) => emitUpdate(meetingId, "turn", turn),
    broadcastWhiteboard: (meetingId: string, whiteboard: any) => emitUpdate(meetingId, "whiteboard", whiteboard),
    broadcastStatus: (meetingId: string, status: string) => emitUpdate(meetingId, "status", { status })
  };
}
