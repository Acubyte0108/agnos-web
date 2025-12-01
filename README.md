# Agnos - Real-Time Patient Form Monitoring System

A Next.js application for healthcare professionals to monitor patient form submissions in real-time.

## Installation

Install dependencies using pnpm:

```bash
pnpm i
```

## Environment Setup

Create a `.env.local` file in the root directory and add the following:

```env
NEXT_PUBLIC_WS_URL=ws://0.0.0.0:4000
```

## Getting Started

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Patient Portal**: Fill out medical forms with real-time progress tracking
- **Staff Dashboard**: Monitor active patients and their form completion status
- **Live View**: Real-time form monitoring for staff members
- **WebSocket Integration**: Instant updates and status changes

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI
- WebSocket for real-time communication
