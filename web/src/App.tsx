import { useEffect, useRef, useState } from "react";
import "./App.css";
import { parseServerMessage, type ClientMessage } from "../../shared/protocol";
import { parseSignal, type SignalPayload } from "./signal";
import { manifest, parsePayload, type Payload } from "./transfer";

const fragment: string = location.hash.slice(1);
const isHost: boolean = fragment === "";

function App() {
   const [status, setStatus] = useState("Connecting...");

   const [file, setFile] = useState<{
      file: File;
   }>();

   const [download, setDownload] = useState<{
      url: string;
      name: string;
   } | null>(null);
   const channelRef = useRef<RTCDataChannel | null>(null);

   async function sendFile(file: File) {
      const channel = channelRef.current;
      if (channel?.readyState !== "open")
         return setStatus("No receiver connected yet");
      try {
         let p: Payload = { t: "metadata", name: file.name, size: file.size };
         channel.send(JSON.stringify(p));
         channel.send(await file.arrayBuffer());
         setStatus(`Sent ${file.name}`);
      } catch (err) {
         setStatus(`Send failed: ${err instanceof Error ? err.message : err}`);
      }
   }

   function safeName(name: unknown): string {
      if (typeof name !== "string") return "download";
      return name.replace(/[\\/\p{Cc}]/gu, "_").slice(0, 200) || "download";
   }

   useEffect(() => {
      const roomID: string = isHost ? crypto.randomUUID() : fragment;

      const ws: WebSocket = new WebSocket("ws://localhost:8080");
      const send = (msg: ClientMessage) => ws.send(JSON.stringify(msg));

      ws.addEventListener("open", () => {
         send(
            isHost
               ? { t: "create", room: roomID }
               : { t: "join", room: roomID },
         );
      });

      const peerConnection = new RTCPeerConnection();

      if (!isHost) {
         peerConnection.addEventListener("datachannel", (e) => {
            const channel = e.channel;
            channel.addEventListener("open", () => setStatus("Channel open"));
            channel.binaryType = "arraybuffer";
            let name = "download";
            channel.addEventListener("message", (m) => {
               if (typeof m.data === "string") {
                  let d = parsePayload(m.data);
                  switch (d?.t) {
                     case "manifest":
                        setStatus(
                           `Manifest Received. Files are: ${d.files.map((f) => f.name)}`,
                        );
                        break;
                     case "metadata":
                        setStatus(`File: ${d.name}, ${d.size}`);
                        break;
                     default:
                        name = safeName(JSON.parse(m.data).name);
                  }
               } else
                  setDownload({
                     url: URL.createObjectURL(new Blob([m.data])),
                     name,
                  });
            });
         });
      }

      const sendSignal = (payload: SignalPayload) => {
         send({ t: "signal", data: JSON.stringify(payload) });
      };

      peerConnection.addEventListener("icecandidate", (e) => {
         if (e.candidate)
            sendSignal({ kind: "ice", candidate: e.candidate.toJSON() });
      });

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
               channelRef.current = channel;
               channel.addEventListener("open", () => {
                  setStatus("Channel open");
               });
               const offer = await peerConnection.createOffer();
               await peerConnection.setLocalDescription(offer);
               sendSignal({ kind: "offer", sdp: offer });
               break;
            }
            case "peer-left": {
               setStatus(`${isHost ? "Peer" : "Host"} left`);
               break;
            }
            case "signal": {
               const payload = parseSignal(msg.data);
               if (payload == null) return setStatus("Bad signal from peer");
               switch (payload.kind) {
                  case "offer": {
                     await peerConnection.setRemoteDescription(payload.sdp);
                     const answer = await peerConnection.createAnswer();
                     await peerConnection.setLocalDescription(answer);
                     sendSignal({ kind: "answer", sdp: answer });
                     break;
                  }
                  case "answer": {
                     await peerConnection.setRemoteDescription(payload.sdp);
                     break;
                  }
                  case "ice": {
                     peerConnection.addIceCandidate(payload.candidate);
                     break;
                  }
               }
               break;
            }
            case "error": {
               setStatus(`Error: ${msg.code}`);
               break;
            }
         }
      });

      return () => {
         ws.close();
         peerConnection.close();
      };
   }, []);

   return (
      <>
         <h1>zipwire</h1>
         <p>{status}</p>
         {isHost && (
            <input
               type="file"
               onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                     setFile({ file });
                     const d: Payload = manifest(file);
                     if (d) {
                        channelRef.current?.send(JSON.stringify(d));
                        setStatus("Sent manifest");
                     } else setStatus("File error!");
                  }
               }}
            />
         )}
         {file !== undefined && (
            <input
               type="button"
               value="Send"
               onClick={() => {
                  sendFile(file.file);
               }}
            />
         )}
         {download && (
            <a href={download.url} download={download.name}>
               Save {download.name}
            </a>
         )}
      </>
   );
}

export default App;
