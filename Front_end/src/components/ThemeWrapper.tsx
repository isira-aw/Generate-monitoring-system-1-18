'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  useEffect(() => {
    if (isHomepage) {
      document.body.classList.remove('theme-applied');
    } else {
      document.body.classList.add('theme-applied');
    }
  }, [isHomepage]);

  return <>{children}</>;
}
