import { WebSocketServer } from "ws";
import { type ServerMessage } from "../../shared/protocol.ts";

let rooms = new Map<string, WebSocket>();

const wss = new WebSocketServer({port: 8080});

console.log("WebSocket server running: ws://localhost:8080");

wss.on("connection", (ws: any) => {
    console.log("New client connected")

    ws.send("Welcome to the WebSocket Server")

    ws.on("message", (m: any) => {
        console.log(`Received: ${m}`)
        ws.send(`Server received ${m}`)
    });

    ws.on("close", () => {
        console.log("Client Disconnected")
    });
});

export function create(id: string, ws: WebSocket): ServerMessage {
    if (rooms.has(id)) return { t: "error", code: "room-exists"};

    rooms.set(id, ws);

    // join room
    wss.on("connection", (ws: WebSocket) => {
        // connect to websocket room
    })
    return { t: "created" };
}

export function join(id: string, ws: WebSocket): ServerMessage {
    if (!rooms.has(id)) return { t: "error", code: "no-room"};

    // join room
    wss.on("connection", (ws: WebSocket) => {
        // connect websocket to room

        // broadcast peer-joined to other users in the room
    })
    return { t: "joined" };
}