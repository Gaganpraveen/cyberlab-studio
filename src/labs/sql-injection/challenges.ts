import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'sql-injection';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'sqli-login-bypass',
    labId: lab,
    title: 'Sign in without the password',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['APP-01'],
    prompt:
      'The login form builds its query by pasting your text straight into the SQL. On the **Login** tab in **vulnerable** mode, get the form to sign you in as a user **without knowing any password**. The lab marks this solved the moment a crafted username logs you in while the password is wrong.',
    hints: [
      'The username you type is placed inside quotes in the query. What happens if your text closes that quote itself?',
      'Everything after a `--` on a line is treated as a comment and ignored by the database.',
      'If you close the quote and then make the rest of the condition always true, the check passes for every row.',
    ],
    solution:
      'Because the input is concatenated into the query, text that closes the opening quote becomes part of the SQL instead of staying a value. Commenting out the remainder of the statement removes the password check entirely, so the query returns a row and the app treats you as signed in. The fix is never to build SQL by string-joining input: use a parameterized (prepared) statement so the input can only ever be data. You will do that on the Fix tab.',
  },
  {
    id: 'sqli-comment',
    labId: lab,
    title: 'The comment marker',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['APP-01'],
    prompt:
      'A bypass works partly by making the database ignore the rest of the query after your input. **Which two-character marker** starts a single-line comment in SQLite, so everything after it on the line is ignored?',
    hints: [
      'It is the same marker used for single-line comments in standard SQL.',
      'Two identical punctuation characters.',
    ],
    acceptedHashes: [hashAnswer('--'), hashAnswer('- -')],
    solution:
      'A double hyphen `--` begins a single-line comment. Once the attacker-controlled input introduces `--`, the database discards the `AND password = ...` part of the query, which is why the password check disappears.',
  },
  {
    id: 'sqli-column-count',
    labId: lab,
    title: 'Match the column count',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['APP-01', 'APP-02'],
    prompt:
      'The product search runs `SELECT name, category, price FROM products ...`. To append a `UNION SELECT` that pulls rows from another table, your added query must return the **same number of columns**. **How many columns** must your `UNION SELECT` return here?',
    hints: [
      'Count the columns the original search already selects.',
      'A UNION only works when both halves have identical column counts.',
    ],
    acceptedHashes: [hashAnswer('3'), hashAnswer('three')],
    solution:
      'The original query selects three columns (name, category, price), so a `UNION SELECT` must also return exactly three columns or the database rejects it with a column-count error. You can confirm this in the search box: a two-column UNION reports an error, a three-column one runs.',
  },
  {
    id: 'sqli-recovery-flag',
    labId: lab,
    title: 'Read a hidden table',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['APP-01'],
    prompt:
      "The product search only ever shows products, but the same database also stores a `users` table with a `recovery_code` column. Using a `UNION SELECT` in the search box (vulnerable mode), surface the admin account's recovery code. It has the shape `CTF{...}`. Enter it as the flag.",
    hints: [
      'Make the product name match nothing, then UNION in a SELECT from the users table.',
      'Remember the column count from the previous challenge: three columns.',
      'Select username, recovery_code, and role (any three columns) so the counts line up, then read the admin row.',
    ],
    acceptedHashes: [hashAnswer('CTF{union_select_all_the_rows}')],
    solution:
      'Because the search concatenates input into the query, a `UNION SELECT` of three columns from `users` is appended to the product results, and the hidden `recovery_code` values appear in the output. The admin recovery code is `CTF{union_select_all_the_rows}`. This is why a single injectable query exposes the whole database, not just the table the feature was meant to read. Parameterized queries stop it: the input stays a search term and can never add a second SELECT.',
  },
  {
    id: 'sqli-harden',
    labId: lab,
    title: 'Fix the login',
    difficulty: 'intermediate',
    points: 25,
    kind: 'task',
    topicIds: ['APP-01', 'APP-02'],
    prompt:
      'On the **Fix** tab, switch the login to the **parameterized** query and run the automated attack battery. The challenge is solved when the parameterized version lets the one legitimate login through and blocks **every** injection in the test suite.',
    hints: [
      'A parameterized (prepared) query fixes the SQL text and binds your input as a separate value.',
      'Run the grader in both modes and compare: the vulnerable query fails several tests, the parameterized one passes them all.',
    ],
    solution:
      "A parameterized statement sends the query structure and the input to the database separately, so the input is always treated as a value and never as SQL. The grader runs the same attack inputs against both versions: the string-built query is bypassed, while the parameterized query treats `' OR '1'='1' --` as a literal username that simply does not exist, so it correctly fails to log in. This is the single most important defense against injection.",
  },
  {
    id: 'sqli-why-params',
    labId: lab,
    title: 'Name the defense',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['APP-01'],
    prompt:
      'In one or two words, **what is the primary defense** against SQL injection that you used on the Fix tab: the technique of sending the query and the data to the database separately so input can never change the query structure?',
    hints: [
      'It goes by two common names, one emphasizing the placeholder parameters and one emphasizing that the statement is compiled ahead of time.',
      'Think "____ queries" or "prepared ____".',
    ],
    acceptedHashes: [
      hashAnswer('parameterized query'),
      hashAnswer('parameterized queries'),
      hashAnswer('parameterised query'),
      hashAnswer('parameterised queries'),
      hashAnswer('parameterized'),
      hashAnswer('prepared statement'),
      hashAnswer('prepared statements'),
      hashAnswer('parameterized query / prepared statement'),
    ],
    solution:
      'Parameterized queries (also called prepared statements) are the primary defense. The query text is fixed and the inputs are bound as parameters, so user input is always data and can never alter the structure of the statement. Input validation and least-privilege database accounts help in depth, but parameterization is what actually closes the injection.',
  },
];
