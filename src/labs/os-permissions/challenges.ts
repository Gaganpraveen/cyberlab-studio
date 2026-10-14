import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { SCRIPT_FLAG, SHADOW_FLAG } from './engine';

const lab = 'os-permissions';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'perm-octal',
    labId: lab,
    title: 'Read the octal',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['SYS-04'],
    prompt:
      'Unix permissions use three octal digits (owner, group, other); each adds read=4, write=2, execute=1. **Which single digit grants read, write, and execute all at once?**',
    hints: ['Add the three values together.', '4 + 2 + 1 = ?'],
    acceptedHashes: [hashAnswer('7'), hashAnswer('seven')],
    solution:
      'The digit **7** = read (4) + write (2) + execute (1). So mode 777 means everyone — owner, group, and other — can do everything, and 644 means the owner reads and writes while group and other only read. Reading these digits at a glance is the first skill of spotting a dangerous permission.',
  },
  {
    id: 'perm-escalate',
    labId: lab,
    title: 'Escalate through a writable script',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['SYS-04', 'SYS-05'],
    prompt:
      'Find the file that root runs on a schedule but that **you** can write to. As the low-privileged user, overwrite it and let root run your code. Submit the flag. (Look at /opt/backup/run.sh and its mode.)',
    hints: [
      'A file root executes is only as trustworthy as the people who can edit it.',
      'Mode 777 means the last digit — other — includes write.',
    ],
    acceptedHashes: [hashAnswer(SCRIPT_FLAG)],
    solution: `The backup script is owned by root but its mode is 777, so any user can rewrite it. The nightly root cron then executes your commands **as root** — a classic local privilege escalation. The flag is **${SCRIPT_FLAG}**. The lesson: a privileged process must not run a file that unprivileged users can modify.`,
  },
  {
    id: 'perm-fix-script',
    labId: lab,
    title: 'Lock the script down',
    difficulty: 'intermediate',
    points: 15,
    kind: 'task',
    topicIds: ['SYS-04'],
    prompt:
      'chmod /opt/backup/run.sh so that it is no longer world-writable (for example 755 or 750). The lab marks this solved once other users can no longer write it.',
    hints: [
      'The dangerous bit is write in the last (other) digit.',
      'Mode 755 keeps it executable but removes group and other write.',
    ],
    solution:
      'Removing the world-write bit (e.g. chmod 755, or 750 to also drop other&rsquo;s read/execute) means only root can change what root runs. Give privileged, scheduled files the tightest ownership and mode that still lets them work — owner-only write is the norm.',
  },
  {
    id: 'perm-shadow',
    labId: lab,
    title: 'Read the password hashes',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['SYS-04'],
    prompt:
      '/etc/shadow holds every account&rsquo;s password hash and should be unreadable to normal users. Check its mode — if it is world-readable, read it and submit the flag inside.',
    hints: [
      'Mode 644 means the last digit (other) includes read.',
      'Read access to the hashes enables offline cracking of every account.',
    ],
    acceptedHashes: [hashAnswer(SHADOW_FLAG)],
    solution: `/etc/shadow was set to 644, so any user could read it and harvest password hashes for offline cracking. It must be 640 (root:shadow) or stricter. The flag is **${SHADOW_FLAG}**. Over-permissioned sensitive files are as dangerous as a writable one — one leaks, the other lets you write.`,
  },
  {
    id: 'perm-fix-shadow',
    labId: lab,
    title: 'Protect the hashes',
    difficulty: 'intermediate',
    points: 15,
    kind: 'task',
    topicIds: ['SYS-04'],
    prompt:
      'chmod /etc/shadow so that other users cannot read it (for example 640 or 600). The lab marks this solved once the world-read bit is gone.',
    hints: [
      'The dangerous bit is read in the other digit.',
      'chmod 640 keeps root and the shadow group but drops other.',
    ],
    solution:
      'Setting /etc/shadow to 640 (owner root read/write, group shadow read, other nothing) — or 600 — removes the world-read bit that exposed the hashes. Grant sensitive files only to the identities that must use them, and audit for the common mistakes: world-readable secrets and world-writable executables.',
  },
  {
    id: 'perm-suid',
    labId: lab,
    title: 'Name the special bit',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['SYS-04'],
    prompt:
      'Look at /usr/bin/checkpw — its mode is 4755 and its owner column shows an **s** (-rwsr-xr-x). That special bit makes the program run with the owner&rsquo;s (root&rsquo;s) privileges no matter who starts it. **What is this bit called?**',
    hints: [
      'It is spelled with &ldquo;set&rdquo; and &ldquo;uid&rdquo;.',
      'The leading octal digit 4 sets it.',
    ],
    acceptedHashes: [
      hashAnswer('setuid'),
      hashAnswer('suid'),
      hashAnswer('set uid'),
      hashAnswer('set-uid'),
      hashAnswer('setuid bit'),
      hashAnswer('the setuid bit'),
    ],
    solution:
      'It is the **setuid** (SUID) bit — the leading 4 in 4755, shown as an s in the owner&rsquo;s execute position. A setuid-root program runs as root for any caller, which is why such binaries are a prime privilege-escalation target: a bug in one becomes a root compromise. Keep setuid binaries few, small, and audited.',
  },
];
