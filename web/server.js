import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({port: 8080});

console.log("WebSocket server running: ws://localhost:8080");

wss.on("connection", (ws) => {
    console.log("New client connected")

    ws.send("Welcome to the WebSocket Server")

    ws.on("message", (m) => {
        console.log(`Received: ${m}`)
        ws.send(`Server received ${m}`)
    });

    ws.on("close", () => {
        console.log("Client Disconnected")
    });
});