import { parseObject } from "../../shared/protocol.ts";

export type SignalPayload =
   | { kind: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
   | { kind: "ice"; candidate: RTCIceCandidateInit };

export function parseSignal(data: string): SignalPayload | null {
   let msg = parseObject(data);

   if (!msg) return null;

   switch (msg.kind) {
      case "offer":
      case "answer":
         return "sdp" in msg && typeof msg.sdp === "object"
            ? { kind: msg.kind, sdp: msg.sdp as RTCSessionDescriptionInit }
            : null;
      case "ice":
         return "candidate" in msg && typeof msg.candidate === "object" && msg.candidate !== null
            ? { kind: "ice", candidate: msg.candidate as RTCIceCandidateInit }
            : null;
      default:
         return null;
   }
}
