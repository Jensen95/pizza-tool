---
name: session-review
description: Review the current session and extract durable learnings as memories, skills, or settings changes. Use at the end of a working session, or when the user asks to "review the session", "capture learnings", or "what should we remember".
---

# Session Review

Review the **current conversation** (not the git history) and extract the most
valuable durable learnings. Goal: turn one-off discoveries into reusable setup.

## Steps

1. Scan the session for: bugs fixed, patterns that worked, gotchas/footguns hit,
   tools or commands discovered, and corrections of wrong assumptions.
2. Pick the ~5 highest-value items. Prefer things that will recur over trivia.
3. Classify each item as exactly one of:
   - **memory** → add to `CLAUDE.md` (project-wide facts, gotchas, commands)
   - **skill** → new/updated file in `.claude/skills/` (a repeatable workflow)
   - **settings** → permission/env change in `.claude/settings.json`
4. Output a single prioritized list. For each item give:
   - Priority (P1/P2/P3)
   - Classification + exact target file
   - One-line rationale
   - The **exact content** to add (copy-paste ready), not a description

## Rules

- Be concrete and actionable. No vague advice.
- Skills are prompts, not manuals — keep them short.
- Do not write any files. Output the list and let the user approve.
- Skip anything already captured in `CLAUDE.md` or an existing skill.
