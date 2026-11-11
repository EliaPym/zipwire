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
    });

    ws.on("close", () => {
        console.log("Client Disconnected")
    });
});

export function create(id: string, ws: WebSocket): ServerMessage {
    if (rooms.has(id)) return { t: "error", code: "room-exists" };

    rooms.set(id, { host: ws });

    // join room
    wss.on("connection", (ws: WebSocket) => {
        // connect to websocket room
    })
    return { t: "created" };
}

export function join(id: string, ws: WebSocket): ServerMessage {
    if (!rooms.has(id)) return { t: "error", code: "no-room" };

    let currentRoom = rooms.get(id);

    // to fix: when joining a room the socket needs to be added as the recipient
    // need to figure out since receiver is an optional prop
    currentRoom?.receiver = ws;

    rooms[id] = {}
    return { t: "joined" };
}