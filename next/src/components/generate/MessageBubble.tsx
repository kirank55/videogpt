import type { ReactNode } from "react";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
};

export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm leading-7 shadow-sm
         ${
           isUser
             ? "bg-primary text-primary-foreground"
             : "bg-surface-raised text-foreground ring-1 ring-border"
         }`}
      >
        {children}
      </div>
    </div>
  );
}
