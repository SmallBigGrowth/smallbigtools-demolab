# SmallBigTools demo lab

Makes short, real demos of software tools for the SmallBigTools Instagram page, with nobody recording by hand, and renders them into Reels and carousels.

## How a week's Reels get made
1. A queue file (`queue/YYYY-MM-DD.json`) lists the week's tools, how to film each one, and the Reel's words.
2. Pushing it starts **Build reels** (`.github/workflows/build-reels.yml`). Each tool is filmed on the right throwaway machine:
   - `web/`: a scripted browser (Playwright) uses a web tool that needs no sign-in.
   - `desktop/`: a Windows or macOS GitHub Actions machine installs an app from its official source, uses it with sample data, and records the screen. The machine is deleted after the run.
   - `store/`: phone apps, or apps that would need an account or personal data, use the official App Store screenshots (Apple's lookup API), with our own callouts on top.
3. `voice/` reads the voiceover lines with Kokoro (open source, free, runs on the machine's CPU).
4. `reel/` (Remotion) renders a 1080x1920 Reel and 1080x1350 carousel slides from the same spec.
5. Each tool's result is an artifact `reel-<slug>`: `reel.mp4`, `contact.png` (review sheet), `carousel/`, `vo/`, `tool-reel.json`.

Rerun one tool: `gh workflow run build-reels.yml -f queue=queue/2026-11-10.json -f only=<slug>`.
Preview locally: `cd reel && npm i && npx remotion studio src/index.js`.

Every demo uses sample data created by the script. No real accounts, passwords or personal data are used. The voiceover is AI-generated, so posts must carry Instagram's "AI info" label.

MIT licensed. The apps being shown belong to their makers.
