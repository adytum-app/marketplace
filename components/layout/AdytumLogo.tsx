interface AdytumLogoProps {
  className?: string;
}

export function AdytumLogo({ className = "h-8 w-8" }: AdytumLogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-labelledby="adytum-logo-title"
    >
      <title id="adytum-logo-title">Adytum Logo</title>

      <defs>
        <linearGradient
          id="amethyst-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <rect
        x="20"
        y="20"
        width="160"
        height="160"
        rx="32"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="3"
      />

      {/* Middle ring */}
      <rect
        x="46"
        y="46"
        width="108"
        height="108"
        rx="22"
        fill="none"
        stroke="#A78BFA"
        strokeWidth="3"
      />

      {/* Inner core */}
      <rect
        x="72"
        y="72"
        width="56"
        height="56"
        rx="14"
        fill="url(#amethyst-gradient)"
      />
    </svg>
  );
}
