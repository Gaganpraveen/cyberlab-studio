import { Settings } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function SettingsPage() {
  return (
    <PlannedPage
      eyebrow="Settings"
      title="Settings"
      description="Theme, motion, text size, a serif reading face and presenter mode for projectors."
      icon={Settings}
    >
      Theme and presenter mode are in the top bar today.
    </PlannedPage>
  );
}
