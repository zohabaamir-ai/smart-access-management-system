interface SystemLogoProps {
  variant?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg'
  light?: boolean
}


function SystemLogo({
  variant = 'full',
  size = 'md',
  light = false,
}: SystemLogoProps) {

  const sizes = {
    sm: {
      mark: 40,
      title: 'text-lg',
      subtitle: 'text-[7px]',
    },

    md: {
      mark: 52,
      title: 'text-2xl',
      subtitle: 'text-[8px]',
    },

    lg: {
      mark: 68,
      title: 'text-4xl',
      subtitle: 'text-[10px]',
    },
  }


  const currentSize =
    sizes[size]


  if (variant === 'mark') {

    return (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: currentSize.mark,
          height: currentSize.mark,
        }}
      >

        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >

          <defs>

            <linearGradient
              id="shieldGradient"
              x1="18"
              y1="10"
              x2="82"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >

              <stop stopColor="#2563EB" />

              <stop
                offset="0.55"
                stopColor="#06B6D4"
              />

              <stop
                offset="1"
                stopColor="#0B78E3"
              />

            </linearGradient>

          </defs>


          {/* Outer shield */}

          <path
            d="M50 5L88 19V47C88 69 73 87 50 96C27 87 12 69 12 47V19L50 5Z"
            fill="url(#shieldGradient)"
          />


          {/* Inner shield */}

          <path
            d="M50 14L79 25V47C79 64 67 78 50 86C33 78 21 64 21 47V25L50 14Z"
            className="fill-slate-950 dark:fill-slate-900"
          />


          {/* Person */}

          <circle
            cx="50"
            cy="39"
            r="11"
            fill="white"
          />

          <path
            d="M31 65C31 54.5 39.5 48 50 48C60.5 48 69 54.5 69 65V68H31V65Z"
            fill="white"
          />


          {/* Recognition frame */}

          <path
            d="M30 27V22H36M64 22H70V27M30 51V56H36M64 56H70V51"
            stroke="#67E8F9"
            strokeWidth="3"
            strokeLinecap="round"
          />


          {/* Lock */}

          <rect
            x="39"
            y="62"
            width="22"
            height="18"
            rx="4"
            fill="white"
          />

          <path
            d="M44 62V57C44 53.7 46.7 51 50 51C53.3 51 56 53.7 56 57V62"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <circle
            cx="50"
            cy="70"
            r="2.2"
            className="fill-slate-950 dark:fill-slate-900"
          />

          <path
            d="M50 72V76"
            className="stroke-slate-950 dark:stroke-slate-900"
            strokeWidth="2"
            strokeLinecap="round"
          />

        </svg>

      </div>
    )
  }


  return (
    <div className="flex items-center gap-3">

      <SystemLogo
        variant="mark"
        size={size}
      />


      <div className="leading-none">

        <div
          className={`font-bold tracking-tight ${currentSize.title} ${
            light
              ? 'text-white'
              : 'text-slate-950 dark:text-white'
          }`}
        >
          Smart{' '}

          <span className="text-blue-600">
            Access
          </span>

        </div>


        <div
          className={`mt-1 font-medium uppercase tracking-[0.28em] ${currentSize.subtitle} ${
            light
              ? 'text-slate-300'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Management System
        </div>

      </div>

    </div>
  )
}


export default SystemLogo