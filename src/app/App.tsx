import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/radix';
import { useSettings } from '@/lib/settings';

import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);
  const settings = useSettings();
  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster
        theme={settings.theme === 'system' ? 'system' : settings.theme}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: '!bg-surface-2 !border-line-strong !text-fg',
            description: '!text-fg-muted',
          },
        }}
      />
    </TooltipProvider>
  );
}
