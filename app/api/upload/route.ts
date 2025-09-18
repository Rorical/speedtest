import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const bytesToMbps = (bytes: number, seconds: number) => {
  if (seconds <= 0) {
    return 0;
  }

  return (bytes * 8) / (seconds * 1024 * 1024);
};

export async function POST(request: NextRequest) {
  try {
    if (!request.body) {
      return Response.json(
        { success: false, error: 'No upload body received' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    const reader = request.body.getReader();
    let bytesReceived = 0;
    const start = performance.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        bytesReceived += value.length;
      }
    }

    const durationSeconds = (performance.now() - start) / 1000;
    const speedMbps = bytesToMbps(bytesReceived, durationSeconds);

    return Response.json(
      {
        success: true,
        uploadSize: bytesReceived,
        duration: durationSeconds,
        speedMbps: Number(speedMbps.toFixed(2)),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Upload handler failed', error);
    return Response.json(
      { success: false, error: 'Upload failed' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}