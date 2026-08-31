'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, Compass, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomTabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Errands',
      href: '/errands',
      icon: CheckSquare,
      active: pathname === '/errands' || pathname === '/',
    },
    {
      name: 'Quests',
      href: '/quests',
      icon: Compass,
      active: pathname === '/quests',
    },
    {
      name: 'Map',
      href: '/map',
      icon: Map,
      active: pathname === '/map',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 sm:max-w-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2 transition-all duration-200',
                tab.active
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                  tab.active ? 'bg-primary/10 text-primary' : 'bg-transparent'
                )}
              >
                <Icon className={cn('h-5 w-5', tab.active && 'scale-110')} />
              </div>
              <span className="mt-0.5 text-xs tracking-tight">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
