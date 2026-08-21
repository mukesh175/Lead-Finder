import { scoreWeights } from "../config";

export function scoreLead(lead, { keyword, location } = {}) {
  const reasons = [];
  let score = 0;

  const add = (points, label) => {
    if (points <= 0) return;
    score += points;
    reasons.push({ label, points });
  };

  const isSocialProfile = lead.sourceType === "social_profile";
  if (lead.website && !isSocialProfile) add(scoreWeights.website, "Website found");
  if (isSocialProfile) add(scoreWeights.socialProfile, "Public social profile");
  if (lead.email) add(scoreWeights.email, "Public email found");
  if (lead.phone) add(scoreWeights.phone, "Public phone found");

  const haystack = [lead.companyName, lead.description, lead.website, lead.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms = String(keyword || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length > 0 && terms.some((term) => haystack.includes(term))) {
    add(scoreWeights.keywordMatch, "Keyword match");
  }

  if (location) {
    const place = String(location).toLowerCase();
    const leadPlace = [lead.location, lead.city, lead.country].filter(Boolean).join(" ").toLowerCase();
    if (leadPlace && (leadPlace.includes(place) || place.includes(leadPlace))) {
      add(scoreWeights.locationMatch, "Location match");
    }
  }

  if (lead.intentQuote) add(scoreWeights.intentSignal, "Publicly asked for this service");
  if (lead.contactPageUrl) add(scoreWeights.contactPage, "Contact page found");
  if (lead.companyName && !isSocialProfile) add(scoreWeights.company, "Business identified");
  if (lead.sourceType === "website_analysis") add(scoreWeights.relevantSource, "Verified on source website");

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function scoreCategory(score) {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 40) return "Potential";
  return "Low";
}
