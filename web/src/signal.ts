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
         if (!("sdp" in msg) || typeof msg.sdp !== "object") return null;
         return { kind: msg.kind, sdp: msg.sdp as RTCSessionDescriptionInit };
      case "ice":
         if (!("candidate" in msg) || typeof msg.candidate !== "object" || msg.candidate === null)
            return null;
         return { kind: "ice", candidate: msg.candidate as RTCIceCandidateInit };
      default:
         return null;
   }
}
