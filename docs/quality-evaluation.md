# Scene quality evaluation

This is an explicit local benchmark, not a CI job. It compares the isolated
root generator with the frozen dev `main-diagram` generator using the same
eight fixed prompt-duration cases. The cases cover software topology, physical
mechanisms, processes, and comparisons, with two prompts at each supported
duration (5, 10, 15, and 20 seconds).

## Run the complete evaluation

Set `OPENROUTER_API_KEY` and `DEFAULT_MODEL` in `next/.env.local`, install
dependencies, and ensure Chrome, Chromium, or Edge is installed. If the browser
is in a non-standard location, set `CHROME_PATH`.

From `next/`, run:

```powershell
npm run evaluate:quality
```

That one command runs every case three times through root and three times
through dev: 48 outputs in total. It starts a private local renderer, captures
matched frames at 25%, 50%, and 75% of each output, then stops the renderer.
This workflow is intentionally too slow and provider-dependent for CI.

By default, artifacts go to
`../evaluation-artifacts/scene-quality-<timestamp>/`. The parent directory is
ignored by Git so generated media is not committed accidentally. Use
`npm run evaluate:quality -- --output <directory>` to choose another artifact
root outside application runtime data.

Each run directory contains:

- `metadata.json`: prompt, duration, path, repetition, timestamps, model
  identity and options, raw model outputs or failures, usage when available,
  normalized project, diagnostics, and rendered-frame paths.
- `project.json`: the normalized renderer project when generation succeeds.
- `frame-1.png` through `frame-3.png`: directly comparable visual samples.

The evaluation root also contains:

- `manifest.json`: immutable case and run configuration.
- `artifacts.json`: all run metadata in one file.
- `index.html`: root/dev frames side by side for every case and repetition.
- `rubric.json`: the human scoring sheet.
- `results.json`: median and worst-run results per prompt and path, provenance,
  and the overall threshold assessment.

## Score and summarize

Open `index.html`. In `rubric.json`, replace the four `null` values for each
artifact with integer scores from 1 (poor) to 5 (excellent):

- `subjectSpecificity`: the visual encodes the named subject rather than a
  reusable generic diagram.
- `meaningfulGeometry`: spatial relationships and shapes explain the subject.
- `animation`: motion or sequencing clarifies change, flow, or causality.
- `readability`: labels are legible, concise, well placed, and distinct.

Then run:

```powershell
npm run evaluate:quality -- --summarize ..\evaluation-artifacts\scene-quality-<timestamp>
```

The summarizer validates all entered scores. For each prompt and path,
`results.json` identifies the median scored run and the worst failure, including
their overall scores and the worst run's diagnostic severity. Worst failure
selection uses deterministic diagnostic severity first, then human score when
diagnostic severity ties.

The same file records the run timestamp, requested model, observed model
options, and a SHA-256 revision of the exact ordered evaluation-case set. Its
assessment is `incomplete` until all 48 expected artifacts have scores. Once
complete, it is `pass` only when:

- no renderer/schema/generation failure, unusable degraded or fully generic
  fallback scene, or unreadable output disqualifies a run (recoverable
  deterministic normalization remains a diagnostic but does not by itself make
  a run unusable);
- root's overall median is at least dev's;
- every root scoring-category average is at least 3/5; and
- root trails dev by at most 0.5 points on every prompt.

The explicit `--summarize` command exits unsuccessfully for both `incomplete`
and `fail`, after writing the report. This makes the command usable as the final
quality gate while retaining the evidence needed to diagnose a miss. The
initial generation command still finishes normally with an `incomplete`
assessment so the rubric can be scored afterward.

## Deterministic diagnostics

Every normalized output is checked without a model call for:

- renderer schema failure;
- renderer capture failure;
- generation failure;
- deterministic fallback events;
- excessive text/geometry overlap;
- missing animation or staggered reveals;
- text below the readability floor;
- generic equally sized card-row layouts.

These checks are safety and triage signals. Human rubric scores remain the
source of truth for scene visual quality.
