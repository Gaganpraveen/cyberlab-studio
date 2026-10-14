import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { DEP_FLAG, PROVENANCE_FLAG } from './engine';

const lab = 'supply-chain-provenance';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'sc-dep-flag',
    labId: lab,
    title: 'Catch the swapped package',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['CLD-06'],
    prompt:
      'Two dependencies are malicious: one is a public tarball swapped after the lockfile pinned it, the other is an internal name resolved from the public registry. Turn on both controls so neither installs, then submit the flag.',
    hints: [
      'Hash pinning catches the swapped tarball; private-registry scoping catches the confusion package.',
      'You need both controls on — one alone blocks only one of the two.',
    ],
    acceptedHashes: [hashAnswer(DEP_FLAG)],
    solution: `A lockfile that pins a hash turns a silent tarball swap into a loud failure, and scoping internal names to your private registry stops the public registry from shadowing them. With both on, every malicious package is refused. The flag is **${DEP_FLAG}**.`,
  },
  {
    id: 'sc-prov-flag',
    labId: lab,
    title: 'Reject the tampered build',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['CLD-07'],
    prompt:
      'A release with the right name but swapped bytes is on the mirror. Verify its provenance attestation and watch the hash check fail, then submit the flag it reveals.',
    hints: [
      'Provenance ties the artifact&rsquo;s hash to a signed statement from the builder.',
      'Pick the tampered release and run Verify provenance.',
    ],
    acceptedHashes: [hashAnswer(PROVENANCE_FLAG)],
    solution: `Provenance verification recomputes the artifact hash and compares it to the signed attestation. A swapped artifact no longer matches, so verification refuses it — even though the name and version look right. The flag is **${PROVENANCE_FLAG}**. The forged release fails too, on the signature, the builder allowlist, and the source-repository match.`,
  },
  {
    id: 'sc-dep-fix',
    labId: lab,
    title: 'Clean install',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['CLD-06'],
    prompt:
      'Enable the dependency controls until a full install pulls in zero malicious packages. The lab marks this solved when the install is clean.',
    hints: [
      'There are two malicious packages and two controls.',
      'Verify hashes against the lockfile, and scope internal names to the private registry.',
    ],
    solution:
      'A clean install needs both controls because the two attacks are different: a tampered public tarball (caught by hash pinning) and dependency confusion (caught by private-registry scoping). Defense in depth means running both, not choosing one.',
  },
  {
    id: 'sc-confusion',
    labId: lab,
    title: 'Name the confusion attack',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['CLD-06'],
    prompt:
      'An attacker publishes a package to the public registry using the name of your private internal package, at a higher version, so the resolver picks theirs. This attack has a two-word name. **What is it?**',
    hints: ['The resolver is confused about which registry to trust.', 'Dependency ____.'],
    acceptedHashes: [
      hashAnswer('dependency confusion'),
      hashAnswer('a dependency confusion attack'),
      hashAnswer('dependency confusion attack'),
      hashAnswer('substitution attack'),
    ],
    solution:
      '**Dependency confusion** (a substitution attack): the public registry shadows an internal name, and a resolver that prefers the highest version pulls the attacker&rsquo;s package. Scoping internal scopes/names to the private registry — and reserving those names publicly — prevents it.',
  },
  {
    id: 'sc-provenance-term',
    labId: lab,
    title: 'Name the signed record',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['CLD-07'],
    prompt:
      'The signed, verifiable record of how an artifact was built — its source commit, builder, and resulting hash — is called its ____. (One word; &ldquo;attestation&rdquo; also accepted.)',
    hints: [
      'SLSA is the framework that standardizes it.',
      'It is what you verify before trusting a build.',
    ],
    acceptedHashes: [
      hashAnswer('provenance'),
      hashAnswer('build provenance'),
      hashAnswer('attestation'),
      hashAnswer('provenance attestation'),
    ],
    solution:
      '**Provenance** (a build attestation) is a signed statement binding an artifact&rsquo;s hash to the source and builder that produced it. Verifying it — as frameworks like SLSA and in-toto define — turns &ldquo;trust the download&rdquo; into &ldquo;verify the build.&rdquo;',
  },
  {
    id: 'sc-sbom',
    labId: lab,
    title: 'Name the inventory',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CLD-06'],
    prompt:
      'The machine-readable inventory of every component and dependency in a piece of software — used to answer &ldquo;am I affected?&rdquo; when a new vulnerability drops — is abbreviated how? (Four letters.)',
    hints: ['Software Bill Of Materials.', 'It is the four-letter acronym.'],
    acceptedHashes: [
      hashAnswer('sbom'),
      hashAnswer('software bill of materials'),
      hashAnswer('a software bill of materials'),
    ],
    solution:
      'An **SBOM** (Software Bill Of Materials) lists every component and version in a build. When a new CVE lands, you query SBOMs to find which products ship the affected component instead of guessing — the difference between hours and weeks of response.',
  },
];
