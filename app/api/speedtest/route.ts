import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    start(controller) {
      let downloadSpeed = 0;
      let uploadSpeed = 0;
      let ping = 0;
      let stage = 'starting';

      const sendUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const runSpeedTest = async () => {
        try {
          // Stage 1: Ping test
          stage = 'ping';
          sendUpdate({ stage, ping: 0, download: 0, upload: 0 });

          const pingStart = Date.now();
          const pingUrl = `${request.nextUrl.origin}/api/ping`;
          await fetch(pingUrl);
          ping = Date.now() - pingStart;

          sendUpdate({ stage, ping, download: 0, upload: 0 });

          // Stage 2: Real Download test
          stage = 'download';
          sendUpdate({ stage, ping, download: 0, upload: 0 });

          // Test with multiple chunks for progressive speed calculation
          const downloadSizes = [512 * 1024, 1024 * 1024, 2 * 1024 * 1024]; // 512KB, 1MB, 2MB
          let totalDownloadTime = 0;
          let totalDownloadBytes = 0;

          for (let i = 0; i < downloadSizes.length; i++) {
            const size = downloadSizes[i];
            const downloadStart = Date.now();

            const downloadUrl = `${request.nextUrl.origin}/api/download?size=${size}`;
            const response = await fetch(downloadUrl);
            await response.arrayBuffer(); // Actually download the data

            const downloadTime = (Date.now() - downloadStart) / 1000;
            totalDownloadTime += downloadTime;
            totalDownloadBytes += size;

            // Calculate current speed
            downloadSpeed = (totalDownloadBytes * 8) / (1024 * 1024 * totalDownloadTime); // Mbps

            sendUpdate({
              stage,
              ping,
              download: Math.round(downloadSpeed * 100) / 100,
              upload: 0
            });
          }

          // Stage 3: Real Upload test
          stage = 'upload';
          sendUpdate({ stage, ping, download: downloadSpeed, upload: 0 });

          // Test with multiple chunks for progressive speed calculation
          const uploadSizes = [512 * 1024, 1024 * 1024, 2 * 1024 * 1024]; // 512KB, 1MB, 2MB
          let totalUploadTime = 0;
          let totalUploadBytes = 0;

          for (let i = 0; i < uploadSizes.length; i++) {
            const size = uploadSizes[i];

            // Generate test data
            const testData = new ArrayBuffer(size);
            const view = new Uint8Array(testData);
            for (let j = 0; j < size; j++) {
              view[j] = Math.floor(Math.random() * 256);
            }

            const uploadStart = Date.now();
            const uploadUrl = `${request.nextUrl.origin}/api/upload`;

            await fetch(uploadUrl, {
              method: 'POST',
              body: testData,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
            });

            const uploadTime = (Date.now() - uploadStart) / 1000;
            totalUploadTime += uploadTime;
            totalUploadBytes += size;

            // Calculate current speed
            uploadSpeed = (totalUploadBytes * 8) / (1024 * 1024 * totalUploadTime); // Mbps

            sendUpdate({
              stage,
              ping,
              download: downloadSpeed,
              upload: Math.round(uploadSpeed * 100) / 100
            });
          }

          // Final results
          stage = 'complete';
          sendUpdate({
            stage,
            ping,
            download: Math.round(downloadSpeed * 100) / 100,
            upload: Math.round(uploadSpeed * 100) / 100
          });

        } catch (error) {
          sendUpdate({
            stage: 'error',
            error: 'Speed test failed',
            ping: 0,
            download: 0,
            upload: 0
          });
        } finally {
          controller.close();
        }
      };

      runSpeedTest();
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}