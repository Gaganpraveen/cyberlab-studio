import { TrendingUp } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function ProgressPage() {
  return (
    <PlannedPage
      eyebrow="Progress"
      title="Your progress"
      description="Lessons completed, quiz scores and solved challenges, saved only in this browser. Nothing is sent anywhere."
      icon={TrendingUp}
    >
      Your progress is already being saved as you read and practice; this page will show it.
    </PlannedPage>
  );
}
