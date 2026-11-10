import { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 px-6 text-center ${className ?? ''}`}
    >
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        {icon ?? <InboxIcon size={28} className="text-blue-300" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
