'use client';

import { useState, useEffect } from 'react';
import { IconGitHub } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

export function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between w-full px-4 border-b h-14 shrink-0 dark:bg-slate-800 bg-white backdrop-blur-xl">
        <span className="inline-flex items-center home-links whitespace-nowrap">
          <a rel="noopener">
            <img src="./logo.png" alt="serper logo" className="w-20" />
          </a>
        </span>
      </header>
    </>
  );
}