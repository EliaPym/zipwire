export const CHUNK_SIZE: number = 1024 * 64; // 64 KiB chunk size
const HEADER_SIZE: number = Uint32Array.BYTES_PER_ELEMENT * 2; // 8-byte header

const HIGH_WATER = 8 * 1024 * 1024;
const LOW_WATER = 1024 * 1024;

export const chunkCount = (size: number) => Math.ceil(size / CHUNK_SIZE);

type Files = {
   id: number;
   name: string;
   size: number;
   type: string;
   path?: string;
};

function isFiles(x: unknown): x is Files[] {
   if (typeof x !== "object" || x === null || !Array.isArray(x)) return false;
   return (
      "id" in x[0] &&
      typeof x[0].id === "number" &&
      "name" in x[0] &&
      typeof x[0].name === "string" &&
      "size" in x[0] &&
      typeof x[0].size === "number" &&
      "type" in x[0] &&
      typeof x[0].type === "string"
   );
}

export type Payload =
   | { t: "manifest"; id: number; files: Files[]; chunkSize: number }
   | { t: "metadata"; name: string; size: number }
   | { t: "accept"; fileIDs: number[] }
   | { t: "reject" }
   | { t: "file-end"; fileID: number; chunks: number }
   | { t: "file-ok"; fileID: number }
   | { t: "abort" };

export function parsePayload(data: string): Payload | null {
   let p: unknown;
   try {
      p = JSON.parse(data);
   } catch {
      return null;
   }

   if (typeof p !== "object" || p === null || !("t" in p)) return null;

   switch (p.t) {
      case "manifest":
         if (
            !("id" in p) ||
            typeof p.id !== "number" ||
            !("files" in p) ||
            !isFiles(p.files) ||
            !("chunkSize" in p) ||
            typeof p.chunkSize !== "number"
         )
            return null;
         return {
            t: "manifest",
            id: p.id,
            files: p.files,
            chunkSize: p.chunkSize
         };
      default:
         return null;
   }
}

export function manifest(f: File): Payload {
   let m: Payload = {
      t: "manifest",
      id: 0,
      files: [{ id: 0, name: f.name, size: f.size, type: f.type }],
      chunkSize: CHUNK_SIZE
   };
   return m;
}

export function chunk(f: File[]): ArrayBuffer | null {
   let fileID: number = 0;
   f.forEach(function (file) {
      fileID++;
      const chunkCount: number = Math.ceil(file.size / CHUNK_SIZE);
   });
   return null;
}

export function frame(fileID: number, index: number, payload: ArrayBuffer) {
   const out = new Uint8Array(HEADER_SIZE + payload.byteLength);
   const view = new DataView(out.buffer);
   view.setInt32(0, fileID);
   view.setInt32(4, index);
   out.set(new Uint8Array(payload), HEADER_SIZE);
   return out;
}

export function unframe(data: ArrayBuffer) {
   if (data.byteLength < HEADER_SIZE) return null;
   const view = new DataView(data);
   return {
      fileID: view.getUint32(0),
      index: view.getUint32(4),
      payload: new Uint8Array(data, HEADER_SIZE)
   };
}

export function drained(channel: RTCDataChannel) {
   return new Promise<void>((resolve) => {
      const ac = new AbortController();
      const done = () => {
         ac.abort;
         resolve();
      };
      channel.addEventListener("bufferedamountlow", done, { signal: ac.signal });
      channel.addEventListener("close", done, { signal: ac.signal });
   });
}

export async function sendChunks(
   channel: RTCDataChannel,
   file: File,
   fileID: number,
   onProgress: (sentBytes: number) => void
) {
   channel.bufferedAmountLowThreshold = LOW_WATER;
   const chunks = chunkCount(file.size);
   for (let i = 0; i < chunks; i++) {
      if (channel.bufferedAmount > HIGH_WATER) await drained(channel);
      const offset = i * CHUNK_SIZE;
      const payload = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      channel.send(frame(fileID, i, payload));
      onProgress(offset + payload.byteLength);
   }
   const end: Payload = { t: "file-end", fileID: fileID, chunks };
   channel.send(JSON.stringify(end));
}
