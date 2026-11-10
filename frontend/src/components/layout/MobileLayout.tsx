import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}

export default function MobileLayout({
  children,
  showNav = true,
  className,
}: MobileLayoutProps) {
  return (
    <div className={cn('max-w-md mx-auto min-h-screen relative bg-blue-50', className)}>
      <main className={cn(showNav ? 'pb-20' : 'pb-0')}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
