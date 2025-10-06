interface PremiumBadgeProps {
  feature: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function PremiumBadge({ feature, size = 'sm', className = '' }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1'
  };

  return (
    <span className={`inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30 rounded-full font-medium ${sizeClasses[size]} ${className}`}>
      ⭐ {feature}
    </span>
  );
}