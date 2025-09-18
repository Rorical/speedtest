import { randomFillSync } from 'crypto';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;

const DEFAULT_SIZE = 16 * 1024 * 1024; // 16MB
const MAX_SIZE = 256 * 1024 * 1024; // 256MB cap to avoid runaway allocation
const STREAM_CHUNK_SIZE = 64 * 1024; // 64KB

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedSize = Number.parseInt(url.searchParams.get('size') ?? '') || DEFAULT_SIZE;
  const totalBytes = Math.min(Math.max(requestedSize, STREAM_CHUNK_SIZE), MAX_SIZE);

  let bytesSent = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const remaining = totalBytes - bytesSent;

      if (remaining <= 0) {
        controller.close();
        return;
      }

      const chunkSize = Math.min(STREAM_CHUNK_SIZE, remaining);
      const chunk = Buffer.allocUnsafe(chunkSize);
      randomFillSync(chunk);

      controller.enqueue(chunk);
      bytesSent += chunkSize;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': totalBytes.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}