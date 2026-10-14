import { useEffect } from 'react';

const APP_NAME = 'CyberLab Studio';

/** Set the tab title for the current page ("Lesson title · CyberLab Studio"). */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
