# Lab authoring guide

This guide is for anyone adding or changing a lab, human or AI. A lab is a
self-contained, hands-on exercise. The learner performs a real attack (or a
clearly labeled simulation of one) against a target that exists only inside
their own browser tab. They observe the evidence, build a defense, and prove
it works by re-running the attack.

## Non-negotiable safety rules

1. **No real targets.** A lab never sends network traffic to a host chosen by
   the learner. It never accepts arbitrary URLs, hostnames, or IP addresses as
   attack targets. Every target is a toy system defined in the lab's code, and
   example names use reserved domains such as `.test` and `.example` (RFC 2606,
   RFC 6761).
2. **No runtime network access at all.** Labs work offline. Do not `fetch`
   external resources. Load all assets with the app bundle.
3. **No real credentials, malware, or persistence.** Data is synthetic and
   fictional. Nothing a lab produces is reusable as a weapon outside the lab:
   no deployable payload kits, no real phishing pages, no working command and
   control.
4. **Honest labels.** Every lab declares `mode: 'real'` (the mechanism really
   executes, for example SQLite running in WebAssembly) or
   `mode: 'simulation'` (a deterministic model). Simulated numbers are never
   presented as measured telemetry.
5. **Isolation for untrusted markup.** Anything that renders learner-supplied
   HTML runs in a sandboxed `<iframe>` without `allow-same-origin`. It cannot
   touch the app's storage or DOM.

## Anatomy of a lab

Each lab lives in `src/labs/<lab-id>/` and owns everything in that folder:

| File             | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `index.ts`       | The `LabDefinition`: metadata, objectives, lazy component, challenges |
| `challenges.ts`  | `ChallengeDefinition[]` for this lab                                  |
| `engine.ts`      | Pure TypeScript logic (no DOM, no React), so it can be unit tested    |
| `engine.test.ts` | Vitest unit tests for the engine and the challenge answers            |
| `<Name>Lab.tsx`  | Default-exported React component rendered at `/#/labs/<lab-id>`       |
| other `*.tsx`    | Sub-components, visualizations                                        |

The lab registry (`src/labs/registry.ts`) imports `index.ts`. The lab
component is code-split, so heavy engines only load when the lab opens.

### Layout

Wrap the lab in `LabLayout` (`src/labs/components/LabLayout.tsx`):

```tsx
<LabLayout
  lab={myLab}                       // the LabDefinition from ./index
  guide={<Guide />}                 // briefing + <LabSteps steps={[...]} />
  workspace={<Workspace />}         // the live target, editors, visualizations
  evidence={<EvidenceLog entries={log} onClear={...} />}
  onReset={reset}                   // restore the clean starting state
/>
```

`LabLayout` provides the header with execution and difficulty badges, the
reset confirmation, resizable panels, the Challenges tab (driven by
`lab.challenges`), and a per-lab notebook. Keep the workspace usable from
about 360px wide (it stacks on small screens) up to projector resolution.

### Evidence

Push an entry to the evidence log for every meaningful event (a query
executed, a request rejected, a rule matched). Create entries with
`evidence(level, message, detail?)` from `EvidenceLog.tsx`. Show the raw
artifact (the SQL that ran, the token, the header) in `detail`.

### Challenges

- 4 to 6 per lab, ordered from beginner to advanced, each assessing listed
  `topicIds` from the catalog (`src/content/catalogData.ts`).
- `kind: 'flag'`: the learner finds a `CTF{...}` string by doing the attack.
  `kind: 'answer'`: a short typed answer. Store only
  `acceptedHashes: [hashAnswer('...')]` (from `src/labs/answers.ts`), never
  the plain answer.
- `kind: 'task'`: the lab verifies the work itself (for example, every attack
  test now fails against the learner's fixed query) and calls
  `markChallengeSolved(id)` from `src/lib/progress.ts`.
- Every challenge has 2 or 3 progressive hints and a worked solution in
  Markdown that explains why, not only what.
- Unit-test every accepted answer: the hash in `challenges.ts` must match
  `hashAnswer(answer)`, and the engine must actually produce each flag.

### State

Use `saveLabState(labId, state)` and `loadLabState(labId)` to keep the
learner's work across reloads (inputs, editor contents, settings). Reset
restores the defaults. Never store anything sensitive.

### Writing

- American English, plain words, short sentences. Explain why as well as
  how.
- Address the learner as "you". Name the real-world defense (parameterized
  queries, output encoding, rate limiting) and link the lesson with Markdown
  `lesson:APP-01` links where helpful.
- Include an ethics reminder where the technique could be misused.

### Design and accessibility

- Use the design tokens (`bg-canvas`, `bg-surface`, `bg-surface-2`,
  `border-line`, `text-fg`, `text-fg-muted`, `text-accent-text`,
  `bg-accent`, `text-success`, `text-danger`, and so on) and the shared UI
  components in `src/components/ui/`. Never hard-code colors. The app has
  dark and light themes.
- Every control has a visible label or an `aria-label`. All interactions work
  from the keyboard. Results are announced (`aria-live`). Status is never
  conveyed by color alone.
- Motion should show real state changes (a request moving through a queue, a
  character being replaced). Keep it subtle and fast. CSS animations are
  automatically minimized when the learner prefers reduced motion. For
  JS-driven animation, check `useReducedMotion()` from `src/lib/settings.ts`.

### Testing checklist

- `npx vitest run src/labs/<lab-id>`: engine tests pass.
- `npx tsc --noEmit` and `npx eslint src/labs/<lab-id>`: clean.
- Open `/#/labs/<lab-id>` in a real browser and complete every challenge
  end to end. `node scripts/screenshot.mjs <url> <out.png>` captures a page
  and reports console errors.
