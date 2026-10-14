import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Logo } from '@/components/layout/Logo';

/** Last-resort error screen. Work saved in this browser is not affected. */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-fg text-2xl font-semibold">Something went wrong on this page</h1>
        <p className="text-fg-muted max-w-md text-sm leading-relaxed">
          Your saved progress and notes are safe in this browser. Try going back to the home page.
        </p>
        <pre className="bg-surface-2 border-line text-fg-subtle mx-auto mt-4 max-w-lg overflow-x-auto rounded-lg border p-3 text-left text-xs">
          {message}
        </pre>
      </div>
      <a href="#/" className="text-accent-text font-medium hover:underline">
        Go to the home page
      </a>
    </div>
  );
}
