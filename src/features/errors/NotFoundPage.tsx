import { Compass } from 'lucide-react';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <PageContainer width="narrow">
      <EmptyState
        icon={Compass}
        title="We couldn’t find that page"
        titleAs="h1"
        action={
          <ButtonLink to="/" variant="primary">
            Back to home
          </ButtonLink>
        }
      >
        The link may be out of date. Try the search (Ctrl K) or start from the topic map.
      </EmptyState>
    </PageContainer>
  );
}
