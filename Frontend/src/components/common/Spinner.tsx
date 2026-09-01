import { RefreshCw } from 'lucide-react'

/* =============================================================
   SPINNER

   One spinning indicator for the whole app (buttons, loading
   rows, polling refreshes). Wraps the RefreshCw icon that the
   codebase already uses most often.
============================================================= */

type SpinnerProps = {
  size?: number
  className?: string
}

function Spinner({
  size = 16,
  className = '',
}: SpinnerProps) {
  return (
    <RefreshCw
      size={size}
      className={`animate-spin ${className}`}
    />
  )
}

export default Spinner
