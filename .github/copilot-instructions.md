<!-- Auto-generated guidance for AI coding agents. Keep concise and actionable. -->

# Copilot instructions — new_web

Purpose

- Provide concise, repository-specific guidance so an AI agent can be productive immediately.

Big picture

- This repository is a minimal static website: the project root contains a single HTML file: [forreal.html](forreal.html).
- There is no build system, package manager, backend, or CI configured. All logic and styles live in `forreal.html` (inline CSS and any inline JS you may add).

Quick local run

- Open `forreal.html` directly in a browser for quick checks.
- For a local server (recommended to reproduce relative-path behavior), run from the repository root:

```bash
python -m http.server 8000
# then visit http://localhost:8000/forreal.html
```

Project conventions & patterns

- Single-file site: prefer small, targeted edits to `forreal.html` rather than creating many new files.
- Keep CSS and JS minimal and inline only when the change is tiny; if you add multiple styles/scripts, create `css/` or `js/` directories and update references accordingly.
- Forms in `forreal.html` are static (no server). Do not assume server-side handling when modifying form elements.

Editing guidelines for AI agents

- Make minimal, well-scoped edits. If a change touches structure (new folders, build tooling), propose it first in a PR description and ask the repo owner before creating new top-level tooling.
- Preserve existing formatting and indentation style when editing `forreal.html`.
- When adding scripts, prefer placing them before `</body>` and keep names and paths simple (e.g., `js/main.js`).
- When modifying forms, ensure changes align with the static nature of the site. For example, use JavaScript to validate inputs locally.

Examples (common tasks)

- Fix text or markup: edit `forreal.html` directly and open in browser to verify.
- Add local dev server command in docs: update README or add a short note in this file.
- Add a new script: create `js/` directory, add the script, and reference it in `forreal.html`.

Testing & debugging

- No automated tests present. Use browser DevTools and the local server above.
- For cross-browser checks, verify in Chrome and Edge on Windows.
- Use the "Inspect" tool in DevTools to debug layout or JavaScript issues.

Integration points

- There are no external integrations (APIs, databases, or package manifests) detectable in the repo.

When to escalate / ask the user

- Propose larger structural changes (new build tools, package.json, or CI updates).
- If server-side behavior is required for forms, ask whether a backend should be added or if static mocks are acceptable.

Files to inspect first

- [forreal.html](forreal.html)

If anything in this guidance is unclear or you'd like a different scope (add CI, modularize assets, or scaffold a small Node/React app), tell me which direction and I'll propose concrete changes.
