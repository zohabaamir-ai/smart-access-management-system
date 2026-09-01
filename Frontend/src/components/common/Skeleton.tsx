/* =============================================================
   SKELETON

   Shimmering placeholder that matches the geometry of the real
   content it stands in for. Falls back to a static tint under
   reduce-motion (handled in index.css).

   <Skeleton className="h-4 w-40" />
   <Skeleton className="h-40 w-full rounded-xl" />
============================================================= */

type SkeletonProps = {
  className?: string
}

function Skeleton({
  className = '',
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded-md ${className}`}
    />
  )
}

export default Skeleton
