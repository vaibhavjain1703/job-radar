# Job Radar — standalone daily scraper + dashboard

Scrapes LinkedIn + Naukri via Apify actors, scores listings against your
resume profile, filters out startups/small companies, and generates a
visual dashboard — automatically, once a day, hosted at a URL you check
every morning.

## What's real here, said plainly

- The scraping, scoring, and filtering logic: real, syntax-checked, uses
  actual live Apify actors I confirmed exist.
- The daily automation: real, via GitHub Actions — once set up, GitHub's
  servers run this, not your machine.
- The dashboard: real, generated fresh from each day's scraped data.
- What I **couldn't** do from my end: actually execute a live run against
  Apify (no network access in my sandbox) or guarantee the actors' output
  fields never change. Your first local test run is the real proof this
  works — do that before relying on the automated version.

---

## Step-by-step setup

### 1. Get an Apify token
Sign up free at [apify.com](https://apify.com) then go to
https://console.apify.com/account/integrations and copy your API token.

### 2. Install dependencies
```bash
cd job-radar
npm install
```

### 3. Add your token
```bash
cp .env.example .env
```
Open `.env` and paste your token:
```
APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxxx
```

### 4. Run it once locally to prove it works
```bash
npm start
```
Watch the console output. You should see it search LinkedIn and Naukri,
then print something like:
```
Done. 6 new roles since last run.
High: 2 | Medium: 5 | Stretch: 2
```
Two files now exist:
- `output/jobs-latest.json` — raw structured data
- `output/dashboard.html` — **open this file directly in your browser
  right now** to see today's dashboard locally, before you even touch
  GitHub.

If this step fails, fix it here first — don't move to automation until
`npm start` works cleanly on your machine.

### 5. Put it on GitHub (as a **private** repo — this is your job search data)
```bash
git init
git add .
git commit -m "Initial job radar setup"
```
Create a new **private** repo on github.com (no README/gitignore — you
already have them), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/job-radar.git
git branch -M main
git push -u origin main
```

### 6. Add your Apify token as a GitHub secret
In your repo on github.com: **Settings → Secrets and variables → Actions
→ New repository secret**
- Name: `APIFY_TOKEN`
- Value: your token from step 1

This lets GitHub's servers run the scraper without your token ever
sitting in the code itself.

### 7. Turn on GitHub Pages — this gives you the daily URL
**Settings → Pages** then under "Build and deployment", set:
- Source: **Deploy from a branch**
- Branch: **main**, folder: **/docs**
- Save

GitHub will give you a URL like:
```
https://YOUR_USERNAME.github.io/job-radar/
```
**Bookmark this URL — this is where you check your dashboard every day.**

### 8. Trigger the first automated run
Go to the **Actions** tab in your repo, click "Daily Job Radar Refresh",
then **Run workflow** (manual trigger button) to fire it once immediately
rather than waiting for tomorrow's schedule.

After it finishes (1-2 minutes), refresh your GitHub Pages URL from step
7 — you should see the dashboard with today's data.

### 9. After that, it's genuinely automatic
The workflow runs every day at 08:00 IST on its own (edit the cron line
in `.github/workflows/daily-refresh.yml` if you want a different time).
Each run:
1. Scrapes fresh listings
2. Scores and filters them
3. Diffs against yesterday to compute "new since last run"
4. Regenerates the dashboard
5. Commits it back to your repo, which auto-updates your Pages URL

You don't need to run anything manually again, just open your bookmarked
URL each morning.

---

## Daily habit

Bookmark: `https://YOUR_USERNAME.github.io/job-radar/`

That's it. Open it, check the streak bar, browse High, Medium, Stretch.

## If something breaks

- **Actions tab shows a red X**: click into the failed run, read the log.
  Most common cause: an Apify actor changed its output format. See the
  comments at the top of `src/fetchJobs.js`, or check
  https://apify.com/store for a current replacement actor.
- **Pages URL shows 404**: double check step 7. Branch must be `main`,
  folder must be `/docs`, and at least one successful workflow run must
  have happened to create the `docs/` folder in the repo.
- **Company size filter feels off**: edit `src/config.js`,
  `sizeFilter.knownLargeCompanies` / `startupSignalTerms` directly.

## Cost
Roughly $0.05 to $0.15 per daily run on Apify's pay-per-result pricing,
comfortably inside the free monthly credit for this volume.
