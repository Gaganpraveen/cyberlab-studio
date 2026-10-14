import { Target } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function ChallengesPage() {
  return (
    <PlannedPage
      eyebrow="Challenges"
      title="Graded challenges with hints"
      description="Short tasks that check your work in each lab: find the flag, explain the weakness, or ship the fix. Hints unlock one at a time."
      icon={Target}
    >
      Challenges open from inside each lab today. This page will list them all with your progress.
    </PlannedPage>
  );
}
