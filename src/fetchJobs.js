import { ApifyClient } from "apify-client";
import { searchQueries } from "./config.js";

/**
 * Real, verified-to-exist Apify actors as of Sept 2026. Actor availability
 * and pricing can change — if a run fails with a "not found" error, search
 * https://apify.com/store for a current replacement and update the IDs below.
 */
const ACTORS = {
  linkedin: "curious_coder/linkedin-jobs-scraper",
  naukri: "memo23/naukri-scraper",
};

export async function fetchAllJobs(apifyToken) {
  const client = new ApifyClient({ token: apifyToken });
  const allJobs = [];

  for (const query of searchQueries) {
    console.log(`[linkedin] searching "${query.keywords}" in ${query.location}...`);
    try {
      const run = await client.actor(ACTORS.linkedin).call({
        keywords: query.keywords,
        location: query.location,
        limitPerSource: 20,
        datePosted: "pastWeek", // only recent postings — keeps the daily refresh meaningful
      });
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      allJobs.push(...items.map((j) => normalizeLinkedIn(j)));
    } catch (err) {
      console.error(`  LinkedIn search failed for "${query.keywords}":`, err.message);
    }

    console.log(`[naukri] searching "${query.keywords}" in ${query.location}...`);
    try {
      const run = await client.actor(ACTORS.naukri).call({
        searchQuery: query.keywords,
        location: "Bengaluru",
        maximumJobs: 20,
        timeFilter: "7d", // last 7 days
      });
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      allJobs.push(...items.map((j) => normalizeNaukri(j)));
    } catch (err) {
      console.error(`  Naukri search failed for "${query.keywords}":`, err.message);
    }
  }

  return dedupeJobs(allJobs);
}

// Different actors return different field names — normalize to one shape
// so scoring.js doesn't need to know which source a job came from.
function normalizeLinkedIn(j) {
  return {
    source: "LinkedIn",
    title: j.title || j.jobTitle || "Untitled role",
    company: j.companyName || j.company || "Unknown company",
    location: j.location || j.jobLocation || "",
    description: j.description || j.descriptionText || "",
    postedAt: j.postedAt || j.listedAt || null,
    url: j.jobUrl || j.link || j.url || "",
    companySizeRaw: j.companySize || j.companyEmployeesCount || null,
  };
}

function normalizeNaukri(j) {
  return {
    source: "Naukri",
    title: j.title || j.jobTitle || "Untitled role",
    company: j.companyName || j.company || "Unknown company",
    location: j.location || j.jobLocation || "",
    description: j.description || j.jobDescription || "",
    postedAt: j.postedDate || j.datePosted || null,
    url: j.jobUrl || j.url || "",
    companySizeRaw: j.companySize || j.companyType || null,
  };
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    const key = `${j.company.toLowerCase()}::${j.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
