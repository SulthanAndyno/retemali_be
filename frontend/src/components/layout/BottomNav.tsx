'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/katalog', label: 'Katalog', icon: BookOpen },
  { href: '/kegiatan', label: 'Kegiatan', icon: Users },
  { href: '/donasi', label: 'Donasi', icon: Heart },
  { href: '/portal', label: 'Portal', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'nav-link flex-1 pt-2 pb-safe',
                isActive && 'active'
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? 'text-blue-600' : 'text-gray-400'}
              />
              <span className={isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
