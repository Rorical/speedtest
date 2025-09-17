import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const size = parseInt(url.searchParams.get('size') || '1048576'); // Default 1MB

  // Generate random data for download test
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);

  // Fill with random data
  for (let i = 0; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': size.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}