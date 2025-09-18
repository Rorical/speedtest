# NekoProof SpeedTest Service

A modern, glassmorphism-styled speed test application built with Next.js, featuring real-time network performance testing that runs directly in the browser.

## Features

- **Real Speed Testing**: Actual data transfer measurement for accurate results
- **Modern UI**: Glass morphism design with dark blue gradient background
- **Real-time Updates**: Live progress tracking driven by in-browser measurements
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Educational Content**: Built-in explanations of how speed tests work
- **Docker Ready**: Easy deployment with Docker and Docker Compose

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Docker Deployment

#### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

#### Using Docker directly

```bash
# Build the image
docker build -t speedtest .

# Run the container
docker run -p 3000:3000 speedtest
```

### Production Deployment

The application includes GitHub Actions workflow that automatically builds Docker images for each release tag.

#### Create a Release

1. Tag your commit:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions will automatically:
   - Build multi-platform Docker images (amd64, arm64)
   - Push to GitHub Container Registry
   - Tag with version and `latest`

#### Deploy the Built Image

```bash
# Pull and run the latest release
docker run -p 3000:3000 ghcr.io/yourusername/speedtest:latest
```

## How It Works

The speed test performs three phases:

1. **Ping Test**: Issues several latency probes and trims outliers before reporting the final average.
2. **Download Test**: Streams pseudo-random data in 8MB chunks until both time and volume thresholds are met, collecting multiple passes and trimming outliers for a stable reading.
3. **Upload Test**: Posts randomized binary payloads repeatedly until time and byte targets are satisfied, combining several passes into a trimmed average.

All tests use real data transfer for accurate network performance measurements.

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `PORT`: Server port (default: 3000)
- `HOSTNAME`: Bind address (default: 0.0.0.0)

### Docker Health Check

The application includes a health check endpoint at `/api/ping` for monitoring container health.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom glassmorphism components
- **TypeScript**: Full type safety
- **Real-time**: Client-side streaming measurements
- **Deployment**: Docker with multi-stage builds

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── download/     # Download test data endpoint
│   │   ├── upload/       # Upload test endpoint
│   │   └── ping/         # Ping/health check endpoint
│   ├── components/
│   │   └── SpeedTest.tsx # Main UI component
│   ├── globals.css       # Tailwind + custom styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Docker Compose configuration
└── Dockerfile           # Multi-stage Docker build
```

## License

MIT License - feel free to use this project for your own speed test applications.