import { FlaskConical } from 'lucide-react';
import { Suspense } from 'react';
import { useParams } from 'react-router';

import { PageContainer } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/primitives';
import { getLab } from '@/labs/registry';

export default function LabPage() {
  const { labId = '' } = useParams();
  const lab = getLab(labId);
  if (!lab) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={FlaskConical}
          title="That lab doesn’t exist"
          action={<ButtonLink to="/labs">See all labs</ButtonLink>}
        />
      </PageContainer>
    );
  }
  const Workspace = lab.component;
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner label={`Loading ${lab.title}`} />
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
