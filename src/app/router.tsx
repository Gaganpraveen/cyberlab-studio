import type React from 'react';

import { createHashRouter, type RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/AppShell';
import { RouteError } from '@/features/errors/RouteError';

type PageModule = { default: React.ComponentType };

/** Lazy-load a page module so each page is its own chunk. */
const page = (load: () => Promise<PageModule>) => async () => {
  const module = await load();
  return { Component: module.default };
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import('@/features/home/HomePage')) },
      { path: 'learn', lazy: page(() => import('@/features/learn/LearnPage')) },
      { path: 'learn/:topicId', lazy: page(() => import('@/features/learn/TopicPage')) },
      { path: 'coverage', lazy: page(() => import('@/features/coverage/CoveragePage')) },
      { path: 'attacks', lazy: page(() => import('@/features/attacks/AttacksPage')) },
      { path: 'attacks/:attackId', lazy: page(() => import('@/features/attacks/AttacksPage')) },
      { path: 'labs', lazy: page(() => import('@/features/labs/LabsPage')) },
      { path: 'labs/:labId', lazy: page(() => import('@/features/labs/LabPage')) },
      { path: 'challenges', lazy: page(() => import('@/features/challenges/ChallengesPage')) },
      { path: 'library', lazy: page(() => import('@/features/library/LibraryPage')) },
      { path: 'glossary', lazy: page(() => import('@/features/glossary/GlossaryPage')) },
      { path: 'glossary/:termId', lazy: page(() => import('@/features/glossary/GlossaryPage')) },
      { path: 'progress', lazy: page(() => import('@/features/progress/ProgressPage')) },
      { path: 'settings', lazy: page(() => import('@/features/settings/SettingsPage')) },
      { path: 'about', lazy: page(() => import('@/features/about/AboutPage')) },
      { path: '*', lazy: page(() => import('@/features/errors/NotFoundPage')) },
    ],
  },
];

/**
 * Hash routing (/#/labs/xss) works unchanged on GitHub Pages, any static host,
 * file servers, embedded previews, and inside the desktop app, with no server
 * rewrite rules.
 */
export function createAppRouter() {
  return createHashRouter(routes);
}
