import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Read the uploaded data
    const arrayBuffer = await request.arrayBuffer();
    const uploadSize = arrayBuffer.byteLength;

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    // Calculate upload speed in Mbps
    const speedBps = uploadSize / duration; // Bytes per second
    const speedMbps = (speedBps * 8) / (1024 * 1024); // Convert to Mbps

    return Response.json({
      success: true,
      uploadSize,
      duration,
      speedMbps: Math.round(speedMbps * 100) / 100,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}