import {
  Bot,
  Braces,
  Bug,
  Cloud,
  Cpu,
  FingerprintPattern,
  Globe,
  KeyRound,
  type LucideIcon,
  Microscope,
  Network,
  Radar,
  Radio,
  Scale,
  Shield,
  Telescope,
  Users,
} from 'lucide-react';

/** An icon for each curriculum area, used on the home page and topic map. */
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  FND: Shield,
  NET: Network,
  CRY: KeyRound,
  IAM: FingerprintPattern,
  WEB: Globe,
  APP: Braces,
  SYS: Cpu,
  OPS: Radar,
  MAL: Bug,
  FOR: Microscope,
  CLD: Cloud,
  IOT: Radio,
  HUM: Users,
  GRC: Scale,
  AI: Bot,
  RES: Telescope,
};

export function domainIcon(domainId: string): LucideIcon {
  return DOMAIN_ICONS[domainId] ?? Shield;
}
