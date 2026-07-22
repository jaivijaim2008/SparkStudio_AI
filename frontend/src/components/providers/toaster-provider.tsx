'use client';

import { Toaster } from 'sonner';
import { useTheme } from './theme-provider';

export function ThemeToaster() {
  const { theme } = useTheme();
  return <Toaster position="bottom-right" theme={theme} />;
}
