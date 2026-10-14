import { ShieldAlert } from 'lucide-react';

import { PlannedPage } from '@/features/common/PlannedPage';

export default function AttacksPage() {
  return (
    <PlannedPage
      eyebrow="Attacks A to Z"
      title="Every major attack, mapped"
      description="Each attack type with what it is, how to defend against it, the lessons that teach it, and its MITRE ATT&CK, CWE, CAPEC and OWASP identifiers."
      icon={ShieldAlert}
    />
  );
}
