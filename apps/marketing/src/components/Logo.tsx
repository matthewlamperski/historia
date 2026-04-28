interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 36, className = '' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Historia"
      height={size}
      style={{ height: size, width: 'auto' }}
      className={className}
    />
  );
}
