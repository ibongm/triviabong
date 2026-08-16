# Finish and Ship the Unfinished Site

## 1. Problem
The site already has a working codebase (React + Vite + Tailwind, npm) but is incomplete — unfinished pages, rough edges, or missing features. Before writing new code, we need a clear picture of what exists and what's actually left to do.

## 2. Approach
Start with reconnaissance, not code. Run `/init` if this repo hasn't been onboarded yet — it generates a CLAUDE.md with project conventions, build commands, and structure so every future session has instant context.

Then use the **Explore subagent** (set to "very thorough") to map the codebase: list all routes/pages under `src/`, find TODO/FIXME comments, identify incomplete components (empty handlers, placeholder text, unstyled sections), and check `src/main.jsx` / `src/App.jsx` for routing gaps. This keeps the raw file-scanning noise out of the main conversation.

Once we have the inventory, switch into **Plan Mode** before touching any code — draft a prioritized punch list (broken pages, missing styles, dead links, unfinished forms) and get your sign-off before implementation starts. For any change that touches 3+ files or needs an architectural call (e.g. restructuring routes, introducing a shared layout), delegate to the **Plan subagent** first.

As fixes land, use **TaskCreate/TaskUpdate** to track the punch list with visible progress instead of a mental checklist. If any task involves a long `npm run build` or Vite dev server watch, kick it off as a **Background agent** so it doesn't block the conversation.

Before any commit, run the **simplify** skill for a final cleanup pass, and run **/review** before merging non-trivial PRs. If the site handles any forms, auth, or third-party API calls, run **/security-review** on those specific changes.

## 3. Files to change
- `src/App.jsx` / `src/main.jsx` — routing and top-level structure
- `src/pages/**` or `src/components/**` — incomplete pages/components found during Explore
- `tailwind.config.js` — if styling gaps are found
- `vite.config.js` — only if build/env issues surface
- `CLAUDE.md` — created/updated via `/init` for future sessions

## 4. Flow
```mermaid
flowchart TD
    A[Run /init if repo not onboarded] --> B[Explore subagent: inventory incomplete pages/components]
    B --> C[Plan Mode: draft prioritized punch list]
    C --> D{User approves plan?}
    D -- No --> C
    D -- Yes --> E[TaskCreate: track punch list items]
    E --> F[Implement fixes per task]
    F --> G[simplify skill: cleanup pass]
    G --> H[/review before merge]
    H --> I{Touches auth/forms/APIs?}
    I -- Yes --> J[/security-review]
    I -- No --> K[Commit]
    J --> K
```

## 5. Risks
- **Scope creep**: "unfinished" is vague — Plan Mode forces an explicit, approved punch list instead of open-ended wandering.
- **Missing context on conventions**: without `/init`, future sessions re-derive project structure each time — costly and error-prone.
- **Silent regressions**: partial features often share components; use the Explore subagent's thorough pass to catch shared-dependency breakage before editing.
- **Style drift**: Tailwind classes can accumulate inconsistently across an unfinished build — the simplify skill catches redundant/inconsistent utility usage before commit.

## 6. Approval
Review the punch list once Explore + Plan Mode produce it, then approve to begin implementation task by task.