import { Library } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function LibraryPage() {
  return (
    <PlannedPage
      eyebrow="Library"
      title="Textbooks, standards and open references"
      description="Current editions and open sources, mapped to every topic. Each lesson page already lists its readings."
      icon={Library}
    />
  );
}
