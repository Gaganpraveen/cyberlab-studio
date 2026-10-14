/** Where the project lives, for "Edit on GitHub" and source links. */
export const SITE = {
  name: 'CyberLab Studio',
  repoUrl: 'https://github.com/Gaganpraveen/cyberlab-studio',
  /** The branch that holds the published content (the repository's default branch). */
  contentBranch: 'build/v1',
} as const;

/** GitHub's web editor for a file in the repository, e.g. "content/lessons/app-01.md". */
export function editOnGitHubUrl(path: string): string {
  return `${SITE.repoUrl}/edit/${SITE.contentBranch}/${path.replace(/^\/+/, '')}`;
}

/** The file's page on GitHub (history, blame, raw). */
export function viewOnGitHubUrl(path: string): string {
  return `${SITE.repoUrl}/blob/${SITE.contentBranch}/${path.replace(/^\/+/, '')}`;
}
