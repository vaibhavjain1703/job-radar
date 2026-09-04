// ---------------------------------------------------------------------------
// EDIT THIS FILE to update your profile, target roles, or filtering rules.
// Everything scoring-related reads from here — no need to touch the scraper
// or scoring logic for routine updates.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Vaibhav Jain",
  // Skills are weighted by importance. Add/remove/adjust as your resume changes.
  skills: {
    core: ["react", "node", "express", "php", "mongodb", "mysql", "typescript", "javascript"],
    strong: ["java", "dsa", "data structures", "algorithms", "rest api", "restful", "postman"],
    familiar: ["docker", "netlify", "github actions", "yaml", "ci/cd", "next.js", "nosql"],
    aiExtra: ["llm", "claude", "openai", "gemini", "ai-powered", "ai-assisted"], // your differentiator — SeniorCarePro.ai work
  },
  experienceYears: 0.5, // ~3 months FTE + 3 internships, be honest here
  locationPreference: ["bellandur", "marathahalli", "bengaluru", "bangalore"],
  locationPriorityBoost: { bellandur: 8, marathahalli: 8, bengaluru: 0, bangalore: 0 }, // extra fit points
};

export const searchQueries = [
  { keywords: "full stack developer", location: "Bengaluru, India" },
  { keywords: "MERN stack developer", location: "Bengaluru, India" },
  { keywords: "software engineer fresher", location: "Bengaluru, India" },
  { keywords: "software development engineer", location: "Bengaluru, India" }, // catches Amazon/Microsoft/JPMorgan-style listings
];

// ---------------------------------------------------------------------------
// FILTERING RULES — "no startups, company size 100+"
// This is the hard part to automate: most scrapers don't return a clean
// employee-count field. We approximate with two layers:
//   1. An explicit blocklist of terms that signal small/startup (edit freely)
//   2. An allowlist of known large companies (always pass, regardless of
//      what the scraper's companySize field says, since that field is often
//      missing or wrong)
// This is a heuristic, not a guarantee — spot-check results before trusting
// them fully, same way you'd want to for any scraped data.
// ---------------------------------------------------------------------------
export const sizeFilter = {
  minEmployees: 100,
  // These terms EXCLUDE a listing outright — this list now does the real
  // work of the filter (see passesSizeFilter default-include comment).
  startupSignalTerms: [
    "seed stage", "series a", "series b", "series c", "founding engineer",
    "founding team", "early-stage", "early stage", "fast-paced startup",
    "0 to 1", "0-to-1", "stealth", "bootstrapped", "small team of",
    "join our small", "growing startup", "backed by y combinator",
    "backed by sequoia", "backed by accel",
  ],
  // Fast-path allowlist — always passes regardless of other signals.
  // Not meant to be exhaustive (that's impossible); expand this whenever
  // you notice a legitimate large company you recognize NOT showing up
  // in results, the way PwC was missing on the first real run.
  knownLargeCompanies: [
    "cisco", "infosys", "tcs", "tata consultancy", "wipro", "accenture", "cognizant",
    "deloitte", "capgemini", "hcl", "tech mahindra", "jpmorgan", "jp morgan",
    "microsoft", "amazon", "google", "meta", "ibm", "sap", "oracle", "adobe",
    "salesforce", "intuit", "target", "walmart", "goldman sachs", "morgan stanley",
    "landmark group", "styli", "dell", "vmware", "juniper", "flipkart", "swiggy",
    "zomato", "paypal", "visa", "mastercard", "ericsson", "nokia", "samsung",
    "pwc", "ey", "ernst & young", "kpmg", "mindtree", "ltimindtree", "l&t infotech",
    "persistent systems", "mphasis", "hexaware", "genpact", "publicis sapient",
    "thoughtworks", "epam", "zensar", "hdfc", "icici", "axis bank", "kotak",
    "barclays", "citi", "citibank", "hsbc", "standard chartered", "société générale",
    "societe generale", "well fargo", "wells fargo", "ge healthcare", "honeywell",
    "siemens", "bosch", "philips", "schneider electric", "nvidia", "qualcomm",
    "broadcom", "intel", "hp", "hewlett packard", "dxc technology", "ntt data",
    "fidelity", "state street", "bny mellon", "american express", "myntra",
    "phonepe", "razorpay", "freshworks", "zoho",
  ],
};

// Scoring weights — recalibrated after real testing showed even a clean
// fresher-perfect match (React+Node+MySQL, explicit "fresher welcome",
// Bengaluru) topped out around 34 with the original weights, meaning
// NOTHING could ever reach High (80+) or Medium (65+). These numbers are
// tuned so a strong, clear match can actually reach those tiers.
export const scoringWeights = {
  coreSkillMatch: 9,
  strongSkillMatch: 6,
  familiarSkillMatch: 3,
  aiExtraMatch: 8,        // your differentiator gets a bonus
  fresherFriendlyBonus: 15, // explicit "fresher welcome" is your single strongest positive signal
  experienceMismatchPenalty: -10, // per year over your actual experience, roughly
  locationBase: 15,
  maxScore: 100,
};
