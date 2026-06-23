# VideoGPT

VideoGPT is an advanced Next.js application that translates natural language prompts into interactive video briefs and renders real-time frame animations. Using a custom Canvas 2D rendering engine, the application acts as a storyboard compiler and renderer, allowing developers and designers to model motion graphics, timelines, text layouts, and particle systems directly from textual descriptions.

<p align="center">
  <video src="https://github.com/user-attachments/assets/cffcbe86-6465-4648-af29-f80287cc9c70" width="100%" height="auto" controls autoplay loop muted></video>
</p>

## Core Features

- **Natural Language Video Synthesis**: Translates text prompts into structured timeline briefs containing scenes, backgrounds, typography, and complex animation properties.
- **Iterative Project Modification**: Refines existing video projects by sending instructions that modify the structural representation of the timeline without rebuilding it from scratch.
- **Custom Canvas 2D Engine**: A specialized rendering pipeline supporting layout designs (single-column, split-column, typography focal, etc.), canvas particle systems, gradients, transition effects, and vector graphic generation.
- **Real-Time Interactive Timeline**: Controls playback speed, scrubs through timelines (5s, 10s, 15s, or 20s), toggles fullscreen rendering, and inspects quality assurance logs.
- **Offline Session Persistence**: Synchronizes workspace configurations, layout themes, and history using Zustand with immediate local storage serialization.
- **Command-Line Suite**: Features dedicated node CLI commands for diagnostics, frame validation, performance telemetry, and evaluation of LLM prompt changes.

## Architecture and Codebase Structure

The application codebase is organized as follows:

- `/src/app`: Implements App Router pages (Generate Workspace, Chat view, Fullscreen Renderer page) and serverless API handlers for orchestration.
- `/src/components`: UI components divided by responsibility:
  - `canvas/`: Custom Canvas 2D elements and lifecycle synchronization hook.
  - `generate/`: Prompt inputs, history feeds, drawer drawers, and chat bubbles.
  - `home/`: Projects dashboard and session lists.
  - `player/`: Video timeline controllers, playback rates, fullscreen hooks, and skeleton states.
- `/src/lib/ai`: Communication client with OpenRouter and JSON-constrained prompt generation.
- `/src/lib/brief`: JSON-schema validators for translating LLM briefs to projects.
- `/src/lib/renderer`: The core HTML5 Canvas 2D renderer including visual validation, layout configurations, particle computations, and animation loops.
- `/src/lib/store.ts`: The central Zustand client state manager responsible for background API dispatching, loading indicators, and local persistence.

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or another standard JavaScript package manager

### Installation

1. Navigate to the project directory:

   ```bash
   cd next
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

### Configuration

Create a `.env.local` file in the `next` directory and supply your API credentials:

```env
# OpenRouter API Credentials
OPENROUTER_API_KEY=your_openrouter_api_key

# Default model identifier for prompt translation
DEFAULT_MODEL=deepseek/deepseek-v4-flash
```

### Running the Application

1. Start the Next.js local development server:

   ```bash
   npm run dev
   ```

2. Open your web browser and navigate to `http://localhost:3000` to access the projects dashboard.

## Available Scripts

The following scripts are defined in `package.json` and can be executed via `npm run <script-name>`:

- `dev`: Launches the local Next.js development server.
- `build`: Compiles the Next.js client application for production.
- `start`: Runs the compiled production server.
- `lint`: Evaluates code style and checks for static errors using ESLint.
- `test`: Executes all unit and integration test suites using Vitest.
- `test:watch`: Launches the Vitest test runner in watch mode.
- `analyze`: Analyzes the rendering configurations and visual structures of projects.
- `eval`: Conducts automatic prompt evaluations, benchmarking model generation outputs.
- `diag`: Performs end-to-end client-to-API verification checks using OpenRouter.
