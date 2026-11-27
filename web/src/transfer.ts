import { parseObject } from "../../shared/protocol.ts";

export const CHUNK_SIZE: number = 1024 * 64; // 64 KiB chunk size
const HEADER_SIZE: number = Uint32Array.BYTES_PER_ELEMENT * 2; // 8-byte header

const HIGH_WATER = 8 * 1024 * 1024;
const LOW_WATER = 1024 * 1024;

export const chunkCount = (size: number) => Math.ceil(size / CHUNK_SIZE);

type ManifestFileData = {
   id: number;
   name: string;
   size: number;
   type: string;
   path?: string;
};

function isID(x: unknown): x is number {
   return typeof x === "number" && x >= 0 && x <= 0xffffffff;
}

function isFileData(data: unknown): data is ManifestFileData {
   if (typeof data !== "object" || data === null) return false;

   if (
      "id" in data &&
      isID(data.id) &&
      "name" in data &&
      typeof data.name === "string" &&
      "size" in data &&
      typeof data.size === "number" &&
      data.size >= 0 &&
      "type" in data &&
      typeof data.type === "string"
   )
      return true;
   return false;
}

function isFilesData(x: unknown): x is ManifestFileData[] {
   if (x === null || !Array.isArray(x)) return false;
   const files: ManifestFileData[] = [];
   for (const item of x) {
      if (!isFileData(item)) return false;
      files.push(item);
   }
   const ids = new Set(files.map((f) => f.id));
   return ids.size === files.length;
}

export type Payload =
   | { t: "manifest"; id: number; files: ManifestFileData[]; chunkSize: number }
   | { t: "metadata"; name: string; size: number }
   | { t: "accept"; fileIDs: number[] }
   | { t: "reject" }
   | { t: "file-end"; fileID: number; chunks: number }
   | { t: "file-ok"; fileID: number }
   | { t: "abort" };

export function parsePayload(data: string): Payload | null {
   let msg = parseObject(data);

   if (!msg) return null;

   switch (msg.t) {
      case "manifest":
         if (
            !("id" in msg) ||
            typeof msg.id !== "number" ||
            !("files" in msg) ||
            !isFilesData(msg.files) ||
            !("chunkSize" in msg) ||
            typeof msg.chunkSize !== "number"
         )
            return null;
         return { t: msg.t, id: msg.id, files: msg.files, chunkSize: msg.chunkSize };
      case "metadata":
         if (
            !("name" in msg) ||
            typeof msg.name !== "string" ||
            !("size" in msg) ||
            typeof msg.size !== "number"
         )
            return null;
         return { t: msg.t, name: msg.name, size: msg.size };
      case "accept":
         if (!("fileIDs" in msg) || !Array.isArray(msg.fileIDs) || !msg.fileIDs.every(isID))
            return null;
         return { t: msg.t, fileIDs: msg.fileIDs };
      case "file-end":
         if (
            !("fileID" in msg) ||
            !isID(msg.fileID) ||
            !("chunks" in msg) ||
            typeof msg.chunks !== "number"
         )
            return null;
         return { t: msg.t, fileID: msg.fileID, chunks: msg.chunks };
      case "file-ok":
         if (!("fileID" in msg) || !isID(msg.fileID)) return null;
         return { t: msg.t, fileID: msg.fileID };
      case "reject":
      case "abort":
         return { t: msg.t };
      default:
         return null;
   }
}

export function createManifest(files: File[]): Extract<Payload, { t: "manifest" }> {
   const mfd: ManifestFileData[] = [];
   files.forEach(function (f) {
      mfd.push({ id: mfd.length, name: f.name, size: f.size, type: f.type });
   });
   let msg: Payload = {
      t: "manifest",
      id: 0,
      files: mfd,
      chunkSize: CHUNK_SIZE
   };
   return msg;
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
         ac.abort();
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

export function unchunk(
   messages: ArrayBuffer[],
   file: ManifestFileData,
   count: number
): Blob | null {
   const parts: Uint8Array<ArrayBuffer>[] = [];
   for (const msg of messages) {
      const c = unframe(msg);
      if (!c || c.fileID !== file.id || c.index !== parts.length) return null;
      parts.push(c.payload);
   }
   const bytes = parts.reduce((n, p) => n + p.byteLength, 0);
   if (parts.length !== count || bytes !== file.size) return null;
   return new Blob(parts, { type: file.type });
}
