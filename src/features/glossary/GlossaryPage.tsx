import { BookMarked } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function GlossaryPage() {
  return (
    <PlannedPage
      eyebrow="Glossary"
      title="Every term, linked and defined"
      description="Hover any underlined term in a lesson to see its definition. The full A-to-Z glossary is coming here."
      icon={BookMarked}
    />
  );
}
