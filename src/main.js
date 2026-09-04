import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fetchAllJobs } from "./fetchJobs.js";
import { scoreAndFilterJobs } from "./scoring.js";
import { generateDashboard } from "./generateDashboard.js";
import { profile } from "./config.js";

const OUTPUT_DIR = path.resolve("output");
const DATA_FILE = path.join(OUTPUT_DIR, "jobs-latest.json");
const HISTORY_FILE = path.join(OUTPUT_DIR, "jobs-history.json");
// docs/ is what GitHub Pages serves from — this is your daily-viewable URL
const DOCS_DASHBOARD = path.resolve("docs", "index.html");

async function main() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error("Missing APIFY_TOKEN. Copy .env.example to .env and add your token from https://console.apify.com/account/integrations");
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log("Fetching jobs from LinkedIn + Naukri...");
  const rawJobs = await fetchAllJobs(token);
  console.log(`Fetched ${rawJobs.length} raw listings before filtering.`);

  const { scored, audit } = scoreAndFilterJobs(rawJobs);
  console.log(`${scored.length} listings passed the size/startup filter and scoring threshold.`);

  // Write the audit log so you can see WHY each job was kept or dropped —
  // open output/audit-log.json anytime the numbers look off, instead of
  // guessing at the filtering logic.
  await fs.writeFile(path.join(OUTPUT_DIR, "audit-log.json"), JSON.stringify(audit, null, 2));

  const previousUrls = await loadPreviousUrls();
  const newJobs = scored.filter((j) => !previousUrls.has(j.url));

  const result = {
    generatedAt: new Date().toISOString(),
    totalTracked: scored.length,
    newSinceLastRun: newJobs.length,
    tiers: {
      high: scored.filter((j) => j.tier === "high"),
      medium: scored.filter((j) => j.tier === "medium"),
      stretch: scored.filter((j) => j.tier === "stretch"),
    },
  };

  await fs.writeFile(DATA_FILE, JSON.stringify(result, null, 2));
  await appendHistory(scored);
  await generateDashboard(result, profile, [
    path.join(OUTPUT_DIR, "dashboard.html"), // local copy
    DOCS_DASHBOARD,                          // GitHub Pages copy
  ]);

  console.log(`\nDone. ${newJobs.length} new roles since last run.`);
  console.log(`High: ${result.tiers.high.length} | Medium: ${result.tiers.medium.length} | Stretch: ${result.tiers.stretch.length}`);
  console.log(`Full data written to ${DATA_FILE}`);

  if (process.env.NOTIFY_WEBHOOK_URL && newJobs.length > 0) {
    await notify(newJobs);
  }
}

async function loadPreviousUrls() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const prev = JSON.parse(raw);
    const all = [...prev.tiers.high, ...prev.tiers.medium, ...prev.tiers.stretch];
    return new Set(all.map((j) => j.url));
  } catch {
    return new Set(); // first run
  }
}

async function appendHistory(scoredJobs) {
  let history = [];
  try {
    history = JSON.parse(await fs.readFile(HISTORY_FILE, "utf8"));
  } catch {
    /* first run */
  }
  history.push({ date: new Date().toISOString().slice(0, 10), count: scoredJobs.length });
  // keep last 90 days only
  history = history.slice(-90);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function notify(newJobs) {
  try {
    const lines = newJobs.slice(0, 10).map((j) => `• [${j.fitScore}] ${j.title} — ${j.company} (${j.url})`);
    await fetch(process.env.NOTIFY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Job Radar: ${newJobs.length} new roles today\n${lines.join("\n")}` }),
    });
    console.log("Notification sent.");
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
