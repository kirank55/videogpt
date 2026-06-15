# Project Rendering Flow

This document outlines how dummy/generated video projects (such as the hybrid project demo) are loaded, passed through the UI components, and rendered to the screen.

---

## 1. Data Source & Route Initializer
* **Route Entry Point:** In [chat/page.tsx](../next/src/app/chat/page.tsx), a hardcoded mock project called `hybridProject` is imported from [hybridProject.ts](../next/src/app/demo/hybridProject.ts).
* **Initial Messages:** This project is attached directly to an assistant message object in the `hybridMessages` array:
  ```typescript
  {
    id: "demo-hybrid",
    role: "assistant",
    content: "Hybrid — Iso Title · Brutalist Stacks · Blueprint Animation · BigDemo Flow.",
    project: hybridProject,
  }
  ```
* The array is passed as the `initialMessages` prop to the workspace layout component `<GenerateWorkspace />`.

---

## 2. Workspace Layout & Chat UI
* **Workspace Component:** [GenerateWorkspace.tsx](../next/src/components/generate/GenerateWorkspace.tsx) maintains the state of the active message thread and passes it to the thread display:
  ```tsx
  <ChatThread messages={messages} />
  ```
* **Thread Display:** [ChatThread.tsx](../next/src/components/generate/ChatThread.tsx) maps over each message in the thread and renders them using the `<MessageBubble />` component.
* **Message Bubble:** [MessageBubble.tsx](../next/src/components/generate/MessageBubble.tsx) checks if a message contains a `project` property. If so, it embeds a video player component:
  ```tsx
  {project ? (
    <div className="mt-3 max-w-xl w-full">
      <PlayerCard project={project} showControls />
    </div>
  ) : null}
  ```

---

## 3. The Interactive Player
* **State Management:** [PlayerCard.tsx](../next/src/components/player/PlayerCard.tsx) wraps the player UI elements in a React context called `<PlayerProvider>`. This provider manages the state of the video project, including playback status (play/pause) and the `currentTime` (the current playhead timestamp in seconds).
* **Canvas Mount:** Inside the card, the frame renders the `<PlayerCanvas>` component, forwarding the project configuration and the reactive `currentTime` state:
  ```tsx
  <PlayerCanvas project={project} currentTime={currentTime} />
  ```

---

## 4. HTML5 Canvas Renderer
* **Canvas Reference:** In [PlayerCanvas.tsx](../next/src/components/canvas/PlayerCanvas.tsx), an HTML5 `<canvas>` element is declared.
* **Trigger Hook:** A `useEffect` hook runs whenever the `currentTime` or `project` changes, obtaining the 2D drawing context and delegating the frame drawing sequence to the library:
  ```typescript
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    renderProjectFrame(context, project, currentTime);
  }, [currentTime, project]);
  ```

---

## 5. Drawing Pipeline
The drawing operations are controlled by the renderer engine located in `next/src/lib/renderer`:

* **Frame Pipeline:** In [renderProjectFrame.ts](../next/src/lib/renderer/renderProjectFrame.ts), the engine:
  1. Clears the canvas for the next frame using `context.clearRect(...)`.
  2. Queries the visible events for the current playhead timestamp using [visibleEvents.ts](../next/src/lib/renderer/visibleEvents.ts).
  3. Sorts active events by their `layer` value (ascending, so lower numbers render first/on bottom).
  4. Renders the active `background` event (or defaults to a fallback color).
  5. Iterates through all other active elements and draws them using specialized canvas drawing functions based on type:
     * **Text Events:** Drawn via `drawText` (in [text.ts](../next/src/lib/renderer/text.ts))
     * **Particle Events:** Drawn via `drawParticles` (in [particle.ts](../next/src/lib/renderer/particle.ts))
     * **Shape Events:** Drawn via `drawShape` (in [shape.ts](../next/src/lib/renderer/shape.ts))
