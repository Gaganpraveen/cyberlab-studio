import { Router } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const spoofingMitmLab: LabDefinition = {
  id: 'spoofing-and-mitm',
  title: 'Spoofing and On-Path Attacks',
  tagline:
    'Use unauthenticated ARP and DNS to sit between a victim and the network, then shut the attack down with inspection and DNSSEC.',
  description:
    'Use unauthenticated ARP and DNS to sit between a victim and the network, then shut the attack down with inspection and DNSSEC.',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  mode: 'simulation',
  engine: 'Deterministic LAN and DNS model (reserved 192.0.2.0/24)',
  topicIds: ['NET-02', 'NET-03'],
  icon: Router,
  objectives: [
    'Read a local network: devices, IP-to-MAC bindings, and the gateway',
    'Exploit unauthenticated ARP to put an attacker on the path (man-in-the-middle)',
    'Poison a DNS resolver cache with a forged, unauthenticated record',
    'Recognize a gratuitous ARP reply and a duplicated MAC as signs of spoofing',
    'Defeat both attacks with dynamic ARP inspection and DNSSEC',
  ],
  component: lazy(() => import('./SpoofingMitmLab')),
  challenges,
};
