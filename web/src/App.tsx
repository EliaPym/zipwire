import { useEffect, useState } from 'react'
import './App.css'
import { parseServerMessage, type ClientMessage } from "../../shared/protocol";
import { parseSignal, type SignalPayload} from "./signal";

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

    const peerConnection = new RTCPeerConnection();
    const sendSignal = (payload: SignalPayload) => {
      send({t: "signal", data: JSON.stringify(payload)});
    }

    peerConnection.addEventListener("icecandidate", (e) => {
      if (e.candidate) sendSignal({ kind: "ice", candidate: e.candidate.toJSON()})
    })

    ws.addEventListener("message", async (e) => {
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
          const channel = peerConnection.createDataChannel("data");
          channel.addEventListener("open", () => {
            setStatus("Channel open")
          });
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          sendSignal({ kind: "offer", sdp: offer.sdp! });
          break;
        }
        case "peer-left": {
          setStatus(`${isHost ? "Peer" : "Host"} left`);
          break;
        }
        case "signal": {
          const payload = parseSignal(msg.data);
          if (payload == null) return setStatus("Bad signal from peer");
          
          break;
        }
        case "error": {
          setStatus(`Error: ${msg.code}`);
          break;
        }
      }
    })

    peerConnection.close();
    return () => ws.close();
  }, [])

  return (
    <>
      <h1>zipwire</h1>
      <p>{status}</p>
    </>
  )
}

export default App
