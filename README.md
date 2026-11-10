# SmallBigTools demo lab

Records short, real demos of software tools for the SmallBigTools Instagram page, without anyone recording by hand.

- `web/`: a scripted browser (Playwright) uses a web tool and records it.
- `desktop/`: a throwaway GitHub Actions machine (Windows or macOS) installs an app from its official source, uses it and records the screen. The machine is deleted after each run.

Every demo uses sample data created by the script. No real accounts, passwords or personal data are used.

Run a desktop demo: Actions → "Record desktop demo" → Run workflow, or `gh workflow run record-desktop.yml -f app=everything`.

MIT licensed. The apps being recorded belong to their makers.
