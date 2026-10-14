import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** A page whose full version is still being built: says what it will hold. */
export function PlannedPage({
  title,
  eyebrow,
  description,
  icon,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  useDocumentTitle(eyebrow);
  return (
    <PageContainer>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-8">
        <EmptyState
          icon={icon}
          title="This page is being built"
          action={<ButtonLink to="/learn">Open the topic map</ButtonLink>}
        >
          {children}
        </EmptyState>
      </div>
    </PageContainer>
  );
}
