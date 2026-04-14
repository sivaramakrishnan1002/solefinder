export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-7 text-gray-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
