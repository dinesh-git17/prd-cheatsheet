# prd-cheatsheet

A personal cheatsheet for the PRD-to-V1 workflow. Tracks checklist
progress for one greenfield project at a time, persisted in localStorage.
Vanilla HTML / CSS / JS. Deployed static on Vercel.

## Editing content

Checklist content lives in `data/phases.js`. Edit that file and reload.

## Running the logic tests

```sh
node --test tests/
```

No build step. Open `index.html` in a browser, or run any static server
from the project root.
