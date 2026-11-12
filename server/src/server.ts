import { WebSocketServer, WebSocket, type RawData } from "ws";
import { parseClientMessage, type ServerMessage } from "../../shared/protocol.ts";

type Room = { host: WebSocket, receiver?: WebSocket };

let rooms = new Map<string, Room>();

function send(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
}

function otherMember(room: Room, ws: WebSocket) {
    return room.host === ws ? room.receiver : room.host;
}

const wss = new WebSocketServer({ port: 8080 });

console.log("Signalling server running: ws://localhost:8080");

wss.on("connection", (ws: WebSocket) => {
    let roomID: string | undefined;

    ws.on("message", (m: RawData) => {
        const msg = parseClientMessage(m.toString());
        if (msg === null) return send(ws, { t: "error", code: "bad-message" });

        if (msg.t !== "signal" && roomID !== undefined) {
            return send(ws, { t: "error", code: "bad-message" });
        }

        switch (msg.t) {
            case "create": {
                if (rooms.has(msg.room)) return send(ws, { t: "error", code: "room-exists" });
                rooms.set(msg.room, { host: ws });
                roomID = msg.room;
                return send(ws, { t: "created" });
            }
            case "join": {
                const room: Room | undefined = rooms.get(msg.room)
                if (!room) return send(ws, { t: "error", code: "no-room" });
                if (room.receiver !== undefined) return send(ws, { t: "error", code: "room-full" })
                room.receiver = ws;
                roomID = msg.room;
                send(ws, { t: "joined" });
                return send(room.host, { t: "peer-joined" });
            }
            case "signal": {
                const room: Room | undefined = roomID ? rooms.get(roomID) : undefined;
                const otherPeer: WebSocket | undefined = room ? otherMember(room, ws) : undefined;
                if (!otherPeer) return send(ws, { t: "error", code: "bad-message" });
                return send(otherPeer, msg);
            }
        }
    });

    ws.on("close", (ws: WebSocket) => {
        const room: Room | undefined = roomID ? rooms.get(roomID) : undefined;
        const otherPeer: WebSocket | undefined = room ? otherMember(room, ws) : undefined;
        if (roomID !== undefined) rooms.delete(roomID);
        if (!otherPeer) return send(ws, { t: "error", code: "bad-message" });
        return send(otherPeer, { t: "peer-joined" });
    });
});
