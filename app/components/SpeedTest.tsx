'use client';

import { useState, useEffect } from 'react';

interface SpeedTestData {
  stage: string;
  ping: number;
  download: number;
  upload: number;
  error?: string;
}

export default function SpeedTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<SpeedTestData>({
    stage: 'idle',
    ping: 0,
    download: 0,
    upload: 0,
  });

  const startSpeedTest = async () => {
    setIsRunning(true);
    setData({ stage: 'starting', ping: 0, download: 0, upload: 0 });

    try {
      const response = await fetch('/api/speedtest');
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const newData = JSON.parse(line.slice(6));
              setData(newData);

              if (newData.stage === 'complete' || newData.stage === 'error') {
                setIsRunning(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Speed test failed:', error);
      setData({
        stage: 'error',
        ping: 0,
        download: 0,
        upload: 0,
        error: 'Failed to connect to speed test server',
      });
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
                <strong>Download Test:</strong> Downloads test data in progressive chunks (512KB, 1MB, 2MB) to measure your download speed.
              </p>
              <p>
                <strong>Upload Test:</strong> Uploads generated test data to our server to measure your upload speed.
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