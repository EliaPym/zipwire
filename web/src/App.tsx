import { useEffect, useState } from 'react'
import './App.css'
import { parseServerMessage, type ClientMessage } from "../../shared/protocol";

function App() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const fragment: string = location.hash.slice(1);
    const isHost: boolean = fragment === "";
    const roomID: string = isHost ? crypto.randomUUID() : fragment;

    const ws: WebSocket = new WebSocket("ws://localhost:8080");
    const send = (msg: ClientMessage) => ws.send(JSON.stringify(msg));

    ws.addEventListener("open", () => {
      send(isHost ? { t: "create", room: roomID } : { t: "join", room: roomID })
    });

    ws.addEventListener("message", (e) => {
      const msg = parseServerMessage(e.data);
      if (msg === null) return setStatus("Null received from server");

      switch (msg.t) {
        case "created": {
          setStatus(`Room created: ${location.origin}/#${roomID}`);
          break;
        }
        case "joined": {
          setStatus("Joined room. Waiting for host");
          break;
        }
        case "peer-joined": {
          setStatus("Peer connected");
          break;
        }
        case "peer-left": {
          setStatus(`${isHost ? "Peer" : "Host"} left`);
          break;
        }
        case "error": {
          setStatus(`Error: ${msg.code}`);
          break;
        }
      }
    })

    return () => ws.close()
  }, [])

  return (
    <>
      <h1>zipwire</h1>
      <p>{status}</p>
    </>
  )
}

export default App
