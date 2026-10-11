# Review prompt — story 1, `blind-hunter` layer

The build workflow's review layer needs a **context-free** reviewer: a session
that has not seen the planning conversation, so it cannot inherit its blind
spots. Run this in a **separate** session and paste the findings back.

Scope: the uncommitted/newly added files in `C:\Users\eranb\Desktop\code\lovely-jordan`
— `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`,
`netlify.toml`, `README.md`, `.gitignore`, `public/robots.txt`,
`public/_headers`, `src/**` (`main.tsx`, `App.tsx`, `index.css`, `config.ts`,
`components/Opening.tsx`).

---

Conduct a review of CONTENT.
Look for what's missing, not only what's wrong.
Compute your finding floor N from the size of the changes: N = min(floor(sqrt(kB) + 1), 10), where kB is the changed content's size in kilobytes. State the arithmetic in one line, then find at least N issues to fix or improve.
Output a Markdown list of findings only — no severity, priority, or ranking.
If the content is empty, stop and say so.
If you have zero findings, re-check and keep thinking; do not stop with an empty list.

CONTENT:
The changed files in the current worktree. Inspect them directly before reviewing.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in your final message; do not route them through any findings-reporting tool the host may offer.
