const CATEGORIES = [
  [80, "Hot", "danger"],
  [60, "Warm", "warning"],
  [40, "Potential", "info"],
  [0, "Low", "secondary"],
];

export function scoreMeta(score) {
  const [, label, variant] = CATEGORIES.find(([min]) => score >= min) || CATEGORIES.at(-1);
  return { label, variant };
}

export default function ScoreBadge({ score }) {
  const { label, variant } = scoreMeta(score ?? 0);
  return (
    <span className={`badge text-bg-${variant}`} title={`${label} lead`}>
      {score ?? 0} · {label}
    </span>
  );
}
