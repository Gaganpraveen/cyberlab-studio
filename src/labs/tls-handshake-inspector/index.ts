import { ShieldCheck } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const tlsHandshakeLab: LabDefinition = {
  id: 'tls-handshake-inspector',
  title: 'TLS Certificate Inspector',
  tagline:
    'Validate real certificates against a fictional CA, catch expired and mismatched ones, then add pinning and HSTS.',
  description:
    'Generate a certificate authority and leaf certificates in the browser with the Web Crypto API, then act as the client: verify signatures, reject expired, hostname-mismatched, and self-signed certificates, defeat SSL stripping with HSTS, and pin a key so even a rogue CA-signed certificate is refused.',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  mode: 'real',
  engine: 'ECDSA P-256 signatures via the Web Crypto API over fictional certificates',
  topicIds: ['NET-05', 'CRY-04'],
  icon: ShieldCheck,
  objectives: [
    'Verify a certificate signature with the trusted CA public key',
    'Reject an expired certificate on its validity period',
    'Reject a certificate whose subject does not match the requested host',
    'Reject a self-signed certificate that chains to no trusted CA',
    'Defeat SSL stripping by enforcing HTTPS with HSTS',
    'Pin a certificate so even a rogue CA-signed certificate is refused',
  ],
  component: lazy(() => import('./TlsHandshakeLab')),
  challenges,
};
