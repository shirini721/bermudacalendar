import Image from 'next/image';
import clsx from 'clsx';

interface MemberBadgeProps {
  name: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  avatarUrl?: string;
  showName?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function MemberBadge({
  name,
  color,
  size = 'md',
  avatarUrl,
  showName = false,
  className,
}: MemberBadgeProps) {
  const initials = getInitials(name);
  const sizeClass = sizeClasses[size];

  const badge = avatarUrl ? (
    <div
      className={clsx(
        'relative rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white',
        sizeClass,
        className
      )}
    >
      <Image
        src={avatarUrl}
        alt={name}
        fill
        className="object-cover"
        sizes="48px"
      />
    </div>
  ) : (
    <div
      className={clsx(
        'flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white select-none',
        sizeClass,
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );

  if (!showName) return badge;

  return (
    <div className="flex items-center gap-2">
      {badge}
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
  );
}
