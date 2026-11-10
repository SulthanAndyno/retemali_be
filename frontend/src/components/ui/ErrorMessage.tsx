import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({
  message = 'Terjadi kesalahan. Silakan coba lagi.',
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 px-6 ${className ?? ''}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-500" />
      </div>
      <p className="text-sm text-gray-600 text-center leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors mt-1"
        >
          <RefreshCw size={15} />
          Coba Lagi
        </button>
      )}
    </div>
  );
}
