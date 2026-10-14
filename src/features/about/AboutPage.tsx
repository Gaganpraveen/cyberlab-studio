import { Info } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function AboutPage() {
  return (
    <PlannedPage
      eyebrow="About and ethics"
      title="About CyberLab Studio"
      description="An open platform for teaching cybersecurity in college courses: linked lessons, a textbook library, and labs that run safely in your browser."
      icon={Info}
    >
      Responsible-use rules, credits and licenses will be listed here.
    </PlannedPage>
  );
}
