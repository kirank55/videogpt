"use client";

/**
 * QualityPanel
 *
 * Collapsible panel shown below the canvas when a project has diagnostics.
 * Displays: score badge (color-coded), pass/fail label, and issue list
 * with icons per severity.
 */

import { useState } from "react";
import type { QualityIssue, QualityResult } from "@/lib/renderer";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ErrorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────

function scoreBadgeStyle(score: number, passed: boolean): string {
  if (!passed || score < 60) return "bg-danger/15 text-danger ring-1 ring-danger/30";
  if (score >= 90) return "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30";
  if (score >= 75) return "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30";
  return "bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30";
}

// ── Issue row ─────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: QualityIssue }) {
  const config = {
    error:   { icon: <ErrorIcon />, color: "text-danger" },
    warning: { icon: <WarnIcon />,  color: "text-amber-500" },
    info:    { icon: <InfoIcon />,  color: "text-blue-400" },
  }[issue.severity];

  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-0.5 ${config.color}`}>{config.icon}</span>
      <div className="min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
          {issue.code}
        </span>
        {issue.eventId !== "__project__" && (
          <span className="ml-1.5 text-[10px] text-muted-foreground/70">
            #{issue.eventId}
          </span>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          {issue.message}
        </p>
      </div>
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type QualityPanelProps = {
  result: QualityResult;
  /** Default collapsed state. */
  defaultOpen?: boolean;
};

export function QualityPanel({ result, defaultOpen = false }: QualityPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { score, passed, issues } = result;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-raised text-foreground shadow-sm">
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
        aria-expanded={open}
      >
        {/* Score badge */}
        <span
          className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums leading-none ${scoreBadgeStyle(score, passed)}`}
        >
          {score}
        </span>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {passed ? (
              <span className="flex items-center gap-1.5 text-emerald-500">
                <CheckIcon /> Quality gate passed
              </span>
            ) : (
              <span className="text-danger">Quality gate failed</span>
            )}
          </p>
          {issues.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {[
                errorCount > 0 && `${errorCount} error${errorCount > 1 ? "s" : ""}`,
                warnCount > 0 && `${warnCount} warning${warnCount > 1 ? "s" : ""}`,
                infoCount > 0 && `${infoCount} info`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <ChevronIcon open={open} />
      </button>

      {/* ── Issue list ───────────────────────────────────────────────────────── */}
      {open && issues.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <ul className="divide-y divide-border/50">
            {issues.map((issue, i) => (
              <IssueRow key={`${issue.eventId}-${issue.code}-${i}`} issue={issue} />
            ))}
          </ul>
        </div>
      )}

      {open && issues.length === 0 && (
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          No issues found — canvas looks clean.
        </div>
      )}
    </div>
  );
}
