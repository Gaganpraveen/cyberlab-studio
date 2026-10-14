import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { DETECTION_FLAG } from './engine';

const lab = 'detection-rule-builder';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'detect-catch',
    labId: lab,
    title: 'Catch the exfiltration',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['OPS-02'],
    prompt:
      'Enable clauses until your rule flags all three malicious events (recall 100%). The lab marks this solved once no attack event slips past — even if you also raise some false alarms for now.',
    hints: [
      'The attack is downloads of large amounts of data.',
      'Start broad: a download-and-large-bytes rule catches every malicious event.',
    ],
    solution:
      'Getting to 100% recall is the easy half: a broad rule such as &ldquo;download AND &gt; 500 MB&rdquo; flags all three exfiltration events. The hard half, next, is doing it without drowning the analyst in false positives.',
  },
  {
    id: 'detect-precision',
    labId: lab,
    title: 'Cut the false positives',
    difficulty: 'intermediate',
    points: 25,
    kind: 'task',
    topicIds: ['OPS-02', 'OPS-01'],
    prompt:
      'Now tune the rule so it still catches all three attacks but raises **zero** false positives (precision 100% and recall 100%). The lab marks this solved when both reach 100%.',
    hints: [
      'A large daytime backup and a large daytime foreign download are legitimate — what separates them from the attack?',
      'Add the off-hours clause: the exfiltration happens at night.',
    ],
    solution:
      'The exfiltration is large downloads **outside business hours**. Adding the off-hours clause drops the benign daytime transfers (the backup and the foreign daytime download) while keeping all three attack events, reaching 100% precision and 100% recall. Good detections are specific to the behavior, not just the volume.',
  },
  {
    id: 'detect-flag',
    labId: lab,
    title: 'Ship the detection',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['OPS-02'],
    prompt: 'When your rule reaches 100% precision and 100% recall, a flag is revealed. Submit it.',
    hints: ['You need precision = recall = 100%.', 'The tuned three-clause rule gets you there.'],
    acceptedHashes: [hashAnswer(DETECTION_FLAG)],
    solution: `A detection that catches every true attack with no false alarms is the goal of detection engineering — analysts trust it and act on it. The flag is **${DETECTION_FLAG}**. In reality you also validate against far more data and watch for drift, but high fidelity on known cases is the baseline.`,
  },
  {
    id: 'detect-fp-term',
    labId: lab,
    title: 'Name the noise',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['OPS-02'],
    prompt:
      'A benign event that your rule alerts on — a legitimate action flagged as an attack — has a two-word name. **What is it?**',
    hints: ['It is the opposite of a true positive.', 'Too many of these cause alert fatigue.'],
    acceptedHashes: [
      hashAnswer('false positive'),
      hashAnswer('a false positive'),
      hashAnswer('false positives'),
      hashAnswer('false alarm'),
    ],
    solution:
      'A **false positive** is a benign event the rule flags as malicious. A flood of them causes alert fatigue: analysts start ignoring the queue, and real alerts get missed. Precision measures how few false positives a rule produces relative to its alerts.',
  },
  {
    id: 'detect-precision-term',
    labId: lab,
    title: 'Define precision',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['OPS-02'],
    prompt:
      'Which metric answers: &ldquo;of all the events my rule alerted on, what fraction were actually malicious?&rdquo; (One word.)',
    hints: ['It is high when there are few false positives.', 'It is tp / (tp + fp).'],
    acceptedHashes: [hashAnswer('precision'), hashAnswer('positive predictive value')],
    solution:
      '**Precision** = true positives / (true positives + false positives) — of everything you alerted on, how much was real. High precision means an analyst can trust each alert. It trades off against recall: a very narrow rule is precise but may miss attacks.',
  },
  {
    id: 'detect-recall-term',
    labId: lab,
    title: 'Define recall',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['OPS-02'],
    prompt:
      'Which metric answers: &ldquo;of all the truly malicious events, what fraction did my rule catch?&rdquo; (One word; two other names are also accepted.)',
    hints: [
      'It is high when there are few false negatives.',
      'It is tp / (tp + fn); also called sensitivity.',
    ],
    acceptedHashes: [
      hashAnswer('recall'),
      hashAnswer('sensitivity'),
      hashAnswer('true positive rate'),
      hashAnswer('detection rate'),
    ],
    solution:
      '**Recall** (sensitivity, true-positive rate) = true positives / (true positives + false negatives) — of everything that was really an attack, how much you caught. A missed attack is a false negative. Detection engineering is the constant balance of recall against precision, chosen to fit what the team can triage.',
  },
];
