import { useEffect, useRef, useState } from "react";
import "./App.css";
import { parseServerMessage, type ClientMessage } from "../../shared/protocol";
import { parseSignal, type SignalPayload } from "./signal";
import { createManifest, parsePayload, sendChunks, unchunk, type Payload } from "./transfer";

const fragment: string = location.hash.slice(1);
const isHost: boolean = fragment === "";

function App() {
   const [status, setStatus] = useState("Connecting...");

   const [files, setFiles] = useState<File[]>();

   const [download, setDownload] = useState<{
      url: string;
      name: string;
   } | null>(null);
   const channelRef = useRef<RTCDataChannel | null>(null);
   const fileRef = useRef<File[]>([]);

   type ManifestPayload = Extract<Payload, { t: "manifest" }>;
   const [manifest, setManifest] = useState<ManifestPayload>();

   function safeName(name: unknown): string {
      if (typeof name !== "string") return "download";
      return name.replace(/[\\/\p{Cc}]/gu, "_").slice(0, 200) || "download";
   }

   useEffect(() => {
      const roomID: string = isHost ? crypto.randomUUID() : fragment;

      const ws: WebSocket = new WebSocket("/ws");
      const send = (msg: ClientMessage) => ws.send(JSON.stringify(msg));

      ws.addEventListener("open", () => {
         send(isHost ? { t: "create", room: roomID } : { t: "join", room: roomID });
      });

      const peerConnection = new RTCPeerConnection();

      if (!isHost) {
         peerConnection.addEventListener("datachannel", (e) => {
            const channel = e.channel;
            channelRef.current = channel;
            channel.addEventListener("open", () => setStatus("Channel open"));
            channel.binaryType = "arraybuffer";
            let expected: ManifestPayload["files"] = [];
            let received: ArrayBuffer[] = [];
            channel.addEventListener("message", (msg) => {
               if (typeof msg.data === "string") {
                  let d = parsePayload(msg.data);
                  switch (d?.t) {
                     case "manifest":
                        let m: Payload | null = parsePayload(msg.data);
                        if (!m || m.t !== "manifest") {
                           setStatus("Error with manifest");
                           channelRef.current?.send(JSON.stringify({ t: "reject" }));
                           break;
                        }
                        setManifest(m);
                        expected = m.files;
                        setStatus(`Manifest received.`);
                        break;
                     case "metadata":
                        setStatus(`File: ${d.name}, ${d.size}`);
                        break;
                     case "abort":
                     // todo
                     case "file-ok":
                     // todo
                     case "file-end":
                        if (!("fileID" in d) || !("chunks" in d)) break;
                        const file = expected.find((f) => f.id === d.fileID);
                        const blob = file && unchunk(received, file, d.chunks);
                        received = [];
                        if (!file || !blob) {
                           setStatus("Transfer failed: file incomplete");
                           break;
                        }
                        setDownload({ url: URL.createObjectURL(blob), name: safeName(file.name) });
                        setStatus(`Received ${file.name}`);
                        break;
                     default:
                        break;
                  }
               } else received.push(msg.data);
            });
         });
      }

      const sendSignal = (payload: SignalPayload) => {
         send({ t: "signal", data: JSON.stringify(payload) });
      };

      peerConnection.addEventListener("icecandidate", (e) => {
         if (e.candidate) sendSignal({ kind: "ice", candidate: e.candidate.toJSON() });
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
               channel.addEventListener("message", async (msg) => {
                  const d = typeof msg.data === "string" ? parsePayload(msg.data) : null;
                  switch (d?.t) {
                     case "accept":
                        const offered = fileRef.current;
                        fileRef.current = [];
                        setStatus("Sending files");
                        try {
                           for (const id of d.fileIDs) {
                              if (offered[id]) await sendChunks(channel, offered[id], id, () => {});
                           }
                        } catch (err) {
                           setStatus(`Send failed: ${err instanceof Error ? err.message : err}`);
                        }
                        break;
                     case "reject":
                        setStatus("Peer rejected transfer");
                        break;
                     default:
                        break;
                  }
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
                     const selectedFiles = [file];
                     setFiles(selectedFiles);
                     setManifest(createManifest(selectedFiles));
                  }
               }}
            />
         )}
         {files !== undefined && (
            <input
               type="button"
               value="Confirm"
               onClick={() => {
                  if (manifest) {
                     fileRef.current = files;
                     channelRef.current?.send(JSON.stringify(manifest));
                     setStatus("Awaiting peer confirmation");
                  } else setStatus("Manifest error");
               }}
            />
         )}
         {!isHost && manifest !== undefined && (
            <div>
               <input
                  type="button"
                  value="Start Download"
                  onClick={() => {
                     const fileIDs: number[] = [];
                     manifest.files.forEach(function (f) {
                        fileIDs.push(f.id);
                     });
                     channelRef.current?.send(JSON.stringify({ t: "accept", fileIDs: fileIDs }));
                  }}
               />
               <p>Transfer ID: {manifest.id}</p>
               <p>Number of files: {manifest.files.length}</p>
               <p>Files (name | type | size):</p>
               {manifest.files.map(function (f, i) {
                  return (
                     <ul key={f.id}>
                        {++i}. {f.name} | {f.type} | {f.size}
                     </ul>
                  );
               })}
            </div>
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
