'use client';

import { useState } from 'react';

interface SpeedTestData {
  stage: string;
  ping: number;
  download: number;
  upload: number;
  error?: string;
}

const PING_ATTEMPTS = 7;

const DOWNLOAD_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
const DOWNLOAD_PASSES = 3;
const MIN_DOWNLOAD_DURATION_MS = 3000;
const MAX_DOWNLOAD_DURATION_MS = 15000;
const MIN_DOWNLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
const UPLOAD_PASSES = 3;
const MIN_UPLOAD_DURATION_MS = 3000;
const MAX_UPLOAD_DURATION_MS = 15000;
const MIN_UPLOAD_BYTES = 1 * 1024 * 1024; // 1MB

const bytesToMbps = (bytes: number, seconds: number) => {
  if (seconds <= 0) {
    return 0;
  }

  return (bytes * 8) / (seconds * 1024 * 1024);
};

const trimmedAverage = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  if (values.length <= 2) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);

  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
};

const roundMbps = (value: number) => Number(value.toFixed(2));

export default function SpeedTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<SpeedTestData>({
    stage: 'idle',
    ping: 0,
    download: 0,
    upload: 0,
  });

  const runPingTest = async () => {
    const latencies: number[] = [];

    for (let i = 0; i < PING_ATTEMPTS; i++) {
      const start = performance.now();
      const response = await fetch('/api/ping', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Ping request failed with status ${response.status}`);
      }

      await response.text();

      const latency = performance.now() - start;
      latencies.push(latency);

      setData((previous) => ({
        ...previous,
        stage: 'ping',
        ping: Math.round(latency),
      }));
    }

    const average = Math.round(trimmedAverage(latencies));

    setData((previous) => ({
      ...previous,
      stage: 'ping',
      ping: average,
    }));

    return average;
  };

  const runDownloadTest = async () => {
    const passSpeeds: number[] = [];

    const executePass = async () => {
      const passStart = performance.now();
      let bytesReceived = 0;
      let shouldStop = false;

      while (!shouldStop) {
        const response = await fetch(`/api/download?size=${DOWNLOAD_CHUNK_SIZE}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Download request failed with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Streaming download is not supported in this browser');
        }

        const reader = response.body.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            if (value) {
              bytesReceived += value.length;
              const elapsedMs = performance.now() - passStart;
              const elapsedSeconds = elapsedMs / 1000;

              if (elapsedSeconds > 0) {
                const currentSpeed = bytesToMbps(bytesReceived, elapsedSeconds);

                setData((previous) => ({
                  ...previous,
                  stage: 'download',
                  download: roundMbps(currentSpeed),
                }));
              }

              if (
                (bytesReceived >= MIN_DOWNLOAD_BYTES &&
                  elapsedMs >= MIN_DOWNLOAD_DURATION_MS) ||
                elapsedMs >= MAX_DOWNLOAD_DURATION_MS
              ) {
                shouldStop = true;
                await reader.cancel().catch(() => undefined);
                break;
              }
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // ignore release errors
          }
        }

        if (shouldStop) {
          break;
        }
      }

      const totalSeconds = (performance.now() - passStart) / 1000;
      return roundMbps(bytesToMbps(bytesReceived, totalSeconds));
    };

    for (let pass = 0; pass < DOWNLOAD_PASSES; pass++) {
      const speed = await executePass();
      passSpeeds.push(speed);

      const aggregated = trimmedAverage(passSpeeds);
      setData((previous) => ({
        ...previous,
        stage: 'download',
        download: roundMbps(aggregated),
      }));
    }

    return roundMbps(trimmedAverage(passSpeeds));
  };

  const runUploadTest = async () => {
    const passSpeeds: number[] = [];

    const executePass = async () => {
      const passStart = performance.now();
      let bytesSent = 0;

      while (true) {
        const payload = new Uint8Array(UPLOAD_CHUNK_SIZE);
        crypto.getRandomValues(payload);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: payload,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        if (!response.ok) {
          throw new Error(`Upload request failed with status ${response.status}`);
        }

        try {
          await response.json();
        } catch {
          // ignore JSON parse errors, the upload already completed
        }

        bytesSent += payload.length;
        const elapsedMs = performance.now() - passStart;
        const elapsedSeconds = elapsedMs / 1000;

        if (elapsedSeconds > 0) {
          const currentSpeed = bytesToMbps(bytesSent, elapsedSeconds);

          setData((previous) => ({
            ...previous,
            stage: 'upload',
            upload: roundMbps(currentSpeed),
          }));
        }

        if (
          (bytesSent >= MIN_UPLOAD_BYTES && elapsedMs >= MIN_UPLOAD_DURATION_MS) ||
          elapsedMs >= MAX_UPLOAD_DURATION_MS
        ) {
          break;
        }
      }

      const totalSeconds = (performance.now() - passStart) / 1000;
      return roundMbps(bytesToMbps(bytesSent, totalSeconds));
    };

    for (let pass = 0; pass < UPLOAD_PASSES; pass++) {
      const speed = await executePass();
      passSpeeds.push(speed);

      const aggregated = trimmedAverage(passSpeeds);
      setData((previous) => ({
        ...previous,
        stage: 'upload',
        upload: roundMbps(aggregated),
      }));
    }

    return roundMbps(trimmedAverage(passSpeeds));
  };

  const startSpeedTest = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setData({ stage: 'starting', ping: 0, download: 0, upload: 0 });

    try {
      setData((previous) => ({
        ...previous,
        stage: 'ping',
        ping: 0,
        download: 0,
        upload: 0,
      }));
      const ping = await runPingTest();

      setData((previous) => ({ ...previous, ping }));

      setData((previous) => ({ ...previous, stage: 'download', download: 0 }));
      const download = await runDownloadTest();

      setData((previous) => ({ ...previous, download }));

      setData((previous) => ({ ...previous, stage: 'upload', upload: 0 }));
      const upload = await runUploadTest();

      setData({
        stage: 'complete',
        ping,
        download,
        upload,
      });
    } catch (error) {
      console.error('Speed test failed:', error);
      setData({
        stage: 'error',
        ping: 0,
        download: 0,
        upload: 0,
        error: error instanceof Error ? error.message : 'Speed test failed',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStageText = () => {
    switch (data.stage) {
      case 'idle':
        return 'Ready to test';
      case 'starting':
        return 'Initializing...';
      case 'ping':
        return 'Testing ping...';
      case 'download':
        return 'Testing download speed...';
      case 'upload':
        return 'Testing upload speed...';
      case 'complete':
        return 'Test complete!';
      case 'error':
        return data.error || 'Test failed';
      default:
        return 'Ready to test';
    }
  };

  const getProgressPercentage = () => {
    switch (data.stage) {
      case 'ping':
        return 25;
      case 'download':
        return 50;
      case 'upload':
        return 75;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const getCurrentSpeed = () => {
    if (data.stage === 'download') return data.download;
    if (data.stage === 'upload') return data.upload;
    return Math.max(data.download, data.upload);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl lg:max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Speed Test
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 opacity-80">
            NekoProof SpeedTest Service
          </p>
        </div>

        {/* Main Content */}
        <div className="glass-container relative overflow-hidden mb-12">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-full blur-lg"></div>

          <div className="relative z-10 p-8 sm:p-10 lg:p-16">
            {/* Speed meter section */}
            <div className="flex flex-col items-center">
              <div className="speed-meter mb-8">
                <div className="speed-meter-bg">
                  <div className="speed-meter-inner">
                    <div className="speed-value text-4xl sm:text-5xl lg:text-6xl">
                      {getCurrentSpeed().toFixed(1)}
                    </div>
                    <div className="speed-unit text-base sm:text-lg opacity-80">Mbps</div>
                  </div>
                </div>
              </div>

              {/* Current test indicator */}
              <div className="text-center mb-8">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  isRunning
                    ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                    : 'bg-white/5 text-blue-200/60 border border-white/10'
                }`}>
                  {isRunning && <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>}
                  {getStageText()}
                </div>
              </div>
            </div>

            {/* Progress section */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-blue-200/60">Progress</span>
                <span className="text-sm text-blue-200/60">{getProgressPercentage()}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            {/* Action button */}
            <div className="text-center">
              <button
                onClick={startSpeedTest}
                disabled={isRunning}
                className="glass-button text-lg px-16 py-5 relative group"
              >
                <span className="relative z-10">
                  {isRunning ? 'Testing...' : 'Start Test'}
                </span>
                {!isRunning && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {(data.stage === 'complete' || data.ping > 0 || data.download > 0 || data.upload > 0) && (
          <div className="results-grid fade-in">
            <div className="glass-card result-card">
              <div className="result-value">{data.ping}</div>
              <div className="result-label">Ping (ms)</div>
            </div>
            <div className="glass-card result-card">
              <div className="result-value">{data.download.toFixed(1)}</div>
              <div className="result-label">Download (Mbps)</div>
            </div>
            <div className="glass-card result-card">
              <div className="result-value">{data.upload.toFixed(1)}</div>
              <div className="result-label">Upload (Mbps)</div>
            </div>
          </div>
        )}

        {/* Information Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* How It Works */}
          <div className="glass-container p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">How It Works</h3>
              <div className="space-y-3 text-blue-200 text-sm">
                <p>
                  <strong>Ping Test:</strong> Measures the time it takes for data to travel from your device to our server and back.
                </p>
                <p>
                  <strong>Download Test:</strong> Streams pseudo-random data in large chunks until time and volume targets are reached, averaging multiple passes for stability.
                </p>
                <p>
                  <strong>Upload Test:</strong> Sends randomized payloads repeatedly until both byte and time thresholds are satisfied to capture sustained throughput.
                </p>
                <p>
                  All tests use real data transfer to provide accurate measurements of your actual network performance.
                </p>
              </div>
          </div>

          {/* Understanding Results */}
          <div className="glass-container p-6">
            <h3 className="text-xl font-semibold mb-4 text-white">Understanding Results</h3>
            <div className="space-y-3 text-blue-200 text-sm">
              <p>
                <strong>Ping (ms):</strong> Lower is better. Under 50ms is excellent, 50-100ms is good, over 100ms may cause noticeable delays.
              </p>
              <p>
                <strong>Download (Mbps):</strong> Speed at which you receive data. Important for streaming, browsing, and downloading files.
              </p>
              <p>
                <strong>Upload (Mbps):</strong> Speed at which you send data. Important for video calls, file uploads, and cloud backups.
              </p>
              <p>
                Results may vary based on network conditions, server distance, and current internet traffic.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 lg:mt-12">
          <p className="text-sm text-blue-200 opacity-60">
            Testing your connection to our servers
          </p>
        </div>
      </div>
    </div>
  );
}