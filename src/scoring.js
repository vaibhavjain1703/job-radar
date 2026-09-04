import { profile, sizeFilter, scoringWeights } from "./config.js";

/**
 * Returns true if the job passes the "no startups, 100+ employees" rule.
 * This is a heuristic — always spot-check a sample of results, the same
 * way you would with any scraped data. False negatives (a good company
 * filtered out) are more likely than false positives here, by design —
 * better to under-include than to send you to a startup by mistake.
 */
export function passesSizeFilter(job) {
  const haystack = `${job.company} ${job.title} ${job.description}`.toLowerCase();

  const isKnownLarge = sizeFilter.knownLargeCompanies.some((name) =>
    job.company.toLowerCase().includes(name)
  );
  if (isKnownLarge) return { pass: true, reason: "known large company" };

  const hitSignal = sizeFilter.startupSignalTerms.find((term) =>
    haystack.includes(term)
  );
  if (hitSignal) return { pass: false, reason: `startup signal term: "${hitSignal}"` };

  if (job.companySizeRaw) {
    const match = String(job.companySizeRaw).match(/(\d+)/);
    if (match && Number(match[1]) < sizeFilter.minEmployees) {
      return { pass: false, reason: `companySizeRaw=${job.companySizeRaw}` };
    }
  }

  return { pass: true, reason: "no exclusion signal found (default include)" };
}

export function scoreJob(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  let score = 0;
  const matched = [];
  const missing = [];

  for (const skill of profile.skills.core) {
    if (text.includes(skill)) { score += scoringWeights.coreSkillMatch; matched.push(skill); }
  }
  for (const skill of profile.skills.strong) {
    if (text.includes(skill)) { score += scoringWeights.strongSkillMatch; matched.push(skill); }
  }
  for (const skill of profile.skills.familiar) {
    if (text.includes(skill)) { score += scoringWeights.familiarSkillMatch; matched.push(skill); }
  }
  for (const skill of profile.skills.aiExtra) {
    if (text.includes(skill)) { score += scoringWeights.aiExtraMatch; matched.push(skill); }
  }

  // Location scoring
  const loc = (job.location || "").toLowerCase();
  let locationScore = 0;
  for (const [place, bonus] of Object.entries(profile.locationPriorityBoost)) {
    if (loc.includes(place)) locationScore = Math.max(locationScore, scoringWeights.locationBase + bonus);
  }
  score += locationScore;

  // Rough experience-requirement penalty. Two fixes made after real testing:
  // 1. "0-1 year" was being misread as "1 year required" by a naive regex,
  //    penalizing exactly the fresher-friendly listings you want most.
  // 2. Explicit fresher/entry-level language should skip the penalty
  //    entirely, since that's a stronger, clearer signal than a number.
  const fresherSignal = /\bfresher|entry[\s-]?level|0\s*[-–to]+\s*1\s*year|0\s*to\s*1\s*yr/i.test(text);
  if (fresherSignal) {
    score += scoringWeights.fresherFriendlyBonus;
  } else {
    // Prefer a proper "X-Y years" / "X+ years" range match over a bare
    // number, and take the LOWER bound as the real requirement (a listing
    // saying "1-3 years" wants someone with at least 1, not 3).
    const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*years?/);
    const plusMatch = text.match(/(\d+)\s*\+\s*years?/);
    const bareMatch = text.match(/(\d+)\s*years?\s*(?:of\s*)?experience/);
    const requiredYears = rangeMatch
      ? Number(rangeMatch[1])
      : plusMatch
      ? Number(plusMatch[1])
      : bareMatch
      ? Number(bareMatch[1])
      : null;

    if (requiredYears !== null) {
      const gap = requiredYears - profile.experienceYears;
      if (gap > 0) score += gap * scoringWeights.experienceMismatchPenalty;
      if (requiredYears > 2) missing.push(`${requiredYears}+ yrs required`);
    }
  }

  score = Math.max(0, Math.min(scoringWeights.maxScore, Math.round(score)));

  const tier = score >= 80 ? "high" : score >= 65 ? "medium" : score >= 50 ? "stretch" : "below-threshold";

  return { ...job, fitScore: score, tier, matchedSkills: [...new Set(matched)], missing };
}

export function scoreAndFilterJobs(jobs) {
  const audit = [];
  const survivors = [];

  for (const job of jobs) {
    const { pass, reason } = passesSizeFilter(job);
    audit.push({ company: job.company, title: job.title, pass, reason });
    if (pass) survivors.push(job);
  }

  const scored = survivors
    .map(scoreJob)
    .filter((j) => j.tier !== "below-threshold")
    .sort((a, b) => b.fitScore - a.fitScore);

  // Also record jobs that passed the size filter but scored too low
  const belowThreshold = survivors.map(scoreJob).filter((j) => j.tier === "below-threshold");
  for (const j of belowThreshold) {
    audit.push({ company: j.company, title: j.title, pass: false, reason: `passed size filter but fitScore=${j.fitScore} < 50` });
  }

  return { scored, audit };
}
