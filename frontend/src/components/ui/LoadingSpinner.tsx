import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  className,
  label = 'Memuat...',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-label={label}
    >
      <div
        className={cn(
          sizeMap[size],
          'rounded-full border-blue-200 border-t-blue-600 animate-spin'
        )}
      />
      {label && (
        <span className="text-xs text-gray-500">{label}</span>
      )}
    </div>
  );
}

/**
 * Full-page centered loading state.
 */
export function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
