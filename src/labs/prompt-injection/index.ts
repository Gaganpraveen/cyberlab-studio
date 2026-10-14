import { MessageSquareWarning } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const promptInjectionLab: LabDefinition = {
  id: 'prompt-injection',
  title: 'Prompt Injection and LLM Guardrails',
  tagline:
    'Make an AI assistant leak its hidden password, evade a keyword blocklist with an obfuscated payload, then close it with canonicalization, separation, and least privilege.',
  description:
    'A deterministic model of prompt injection against an LLM-backed support assistant. The assistant holds an admin password in its hidden system prompt and naively reads user input in the same channel as its instructions, so an override message leaks the secret. A keyword blocklist looks like a fix but an obfuscated payload (homoglyph + zero-width spaces) slips past it and still leaks. The robust controls are structural: input validation with canonicalization, instruction/data separation, and least privilege (keeping the secret out of context). Learn why denylists fail open and how the CIA confidentiality property breaks.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic LLM-assistant rule model',
  topicIds: ['FND-01', 'APP-02'],
  icon: MessageSquareWarning,
  objectives: [
    'Leak a secret from an assistant by injecting instructions into user input',
    'Evade a naive keyword blocklist with homoglyph and zero-width obfuscation',
    'Block the attack with input validation and canonicalization',
    'Separate untrusted data from the instruction channel',
    'Apply least privilege so a successful injection has nothing to steal',
  ],
  component: lazy(() => import('./PromptInjectionLab')),
  challenges,
};
