export type SignalPayload =
    | { kind: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
    | { kind: "ice"; candidate: RTCIceCandidateInit };

export function parseSignal(data: string): SignalPayload | null {
    let p: unknown;
    try {
        p = JSON.parse(data);
    } catch {
        return null;
    }

    if (typeof p !== "object" || p == null || !("kind" in p)) return null;

    switch (p.kind) {
        case "offer":
        case "answer":
            if (!("sdp" in p) || typeof p.sdp !== "object") return null;
            return { kind: p.kind, sdp: p.sdp as RTCSessionDescriptionInit };
        case "ice":
            if (!("candidate" in p) || typeof p.candidate !== "object" || p.candidate === null) return null;
            return { kind: "ice", candidate: p.candidate as RTCIceCandidateInit };
        default:
            return null;
    }
}