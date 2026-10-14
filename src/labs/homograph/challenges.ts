import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'homograph';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'homograph-code-point',
    labId: lab,
    title: 'Name the imposter character',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['WEB-01'],
    prompt:
      'In the inspector, compare `campus.test` with `cаmpus.test`. One character has been swapped. **What is the code point of the swapped character** in the modified name? Answer in `U+XXXX` form.',
    hints: [
      'Line the two names up character by character. Only one cell differs in script.',
      'Click the differing character. Its code point is shown as `U+____`.',
    ],
    acceptedHashes: [hashAnswer('U+0430')],
    solution:
      'The second character looks like a Latin "a" but is **U+0430 CYRILLIC SMALL LETTER A**. The real letter a is U+0061. They share a glyph but are different characters, which is the whole trick behind a homograph.',
  },
  {
    id: 'homograph-script',
    labId: lab,
    title: 'Identify the mixed scripts',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['WEB-01'],
    prompt:
      'The name `cаmpus.test` mixes two writing systems. **Which two scripts** does it combine? Answer as two words separated by "and" (for example, "Latin and Greek").',
    hints: [
      'Each character cell shows its script.',
      'Most letters are one script; exactly one letter is from another.',
    ],
    acceptedHashes: [hashAnswer('Latin and Cyrillic'), hashAnswer('Cyrillic and Latin')],
    solution:
      'The name is mostly **Latin**, but the second letter is **Cyrillic**. Mixing scripts inside a single label is a strong signal of a confusable attack, though some legitimate languages do mix scripts, so it is evidence to inspect, not proof on its own.',
  },
  {
    id: 'homograph-punycode',
    labId: lab,
    title: 'Convert to the ASCII form',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['WEB-01'],
    prompt:
      'Browsers and DNS store internationalized names in an ASCII form using Punycode (the `xn--` prefix). **What is the ASCII-compatible form** of `cаmpus.test` (with the Cyrillic a)? Read it from the host analysis panel.',
    hints: [
      'The host analysis panel shows the "ASCII form" of whatever you type.',
      'It begins with `xn--` and ends with `.test`.',
    ],
    acceptedHashes: [hashAnswer('xn--cmpus-4ve.test')],
    solution:
      'The ASCII form is **`xn--cmpus-4ve.test`**. Punycode encodes the non-ASCII characters into an ASCII string that DNS can carry. Two names that look identical can have completely different `xn--` forms, which is exactly how you tell them apart programmatically.',
  },
  {
    id: 'homograph-destination',
    labId: lab,
    title: 'Read the real destination',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['WEB-02', 'WEB-03'],
    prompt:
      'A fictional message links the text "campus.test" to the host `campus.test.evil-login.test`. In a URL, the real site is the **registrable domain**: the last two labels before the TLD boundary. **Which registrable domain** does that link actually go to?',
    hints: [
      'The displayed link text is not the destination. Read the host from right to left.',
      'The rightmost labels are `evil-login.test`. Everything to the left is a subdomain.',
    ],
    acceptedHashes: [hashAnswer('evil-login.test')],
    solution:
      'The destination is **`evil-login.test`**. Everything to the left (`campus.test.`) is just a subdomain that `evil-login.test` controls. Reading hostnames right to left, at the registrable-domain boundary, defeats this misleading-subdomain trick.',
  },
  {
    id: 'homograph-rule',
    labId: lab,
    title: 'Fix the over-eager rule',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['WEB-01'],
    prompt:
      'The rule builder starts with **Block all non-ASCII** turned on. Run it against the dataset and look at the confusion matrix. It flags the benign names `bücher.test` and `学校.test` (false positives). **Build a rule set that flags every suspicious name but produces zero false positives** on the benign internationalized names. The lab marks this solved when you reach 0 false positives with at least one suspicious name still caught.',
    hints: [
      'Blocking all non-ASCII punishes every language that is not English. That is too blunt.',
      'Turn off "Block all non-ASCII". Turn on "Confusable skeleton" against the protected name, and add the misleading-subdomain and typosquat cases as needed.',
      'A benign IDN like bücher.test does not imitate campus.test, so a skeleton rule leaves it alone.',
    ],
    solution:
      'Turn **off** "Block all non-ASCII" and turn **on** "Confusable skeleton match" with `campus.test` as the protected name. The skeleton rule flags `cаmpus.test`, `campuѕ.test` and `cаmpuѕ.test` because their skeletons equal `campus`, while `bücher.test` and `学校.test` have different skeletons and are left alone. Add exact-allowlisting for known-good names and a separate check for misleading subdomains. The lesson: a good detector targets *imitation of a protected name*, not *being foreign*.',
  },
  {
    id: 'homograph-verdict',
    labId: lab,
    title: 'Write a reasoned verdict',
    difficulty: 'advanced',
    points: 25,
    kind: 'flag',
    topicIds: ['WEB-01', 'WEB-03'],
    prompt:
      'Open the **Investigation** case. You are given a fictional email, its parsed destination host, and the character inspection. Work through the evidence. When your rule set correctly classifies **all twelve** dataset names (precision and recall both 100%), the lab reveals a flag. Submit it here.',
    hints: [
      'You will need more than one rule working together: confusable skeleton, misleading subdomain, and plain ASCII typosquats.',
      'Check every row of the results table. The flag appears above the matrix only when both precision and recall read 100%.',
    ],
    acceptedHashes: [hashAnswer('CTF{skeletons_beat_glyphs}')],
    solution:
      'A single rule cannot catch every case: homographs need the skeleton check, `canpus.test` is a plain ASCII typosquat, and `campus.test.evil-login.test` is a misleading subdomain. Combining confusable-skeleton matching against the protected name, an exact allowlist, and a registrable-domain check reaches 100% on this small, labeled set. Real deployments must still expect false positives and keep a human in the loop; this dataset is a teaching baseline, not proof of a production detector.',
  },
];
