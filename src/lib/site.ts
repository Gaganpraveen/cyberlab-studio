/** Where the project lives, for "Edit on GitHub" and source links. */
export const SITE = {
  name: 'CyberLab Studio',
  repoUrl: 'https://github.com/Gaganpraveen/cyberlab-studio',
  /** The branch that holds the published content (the repository's default branch). */
  contentBranch: 'build/v1',
  /** Windows, macOS and Linux installers, attached to each GitHub release. */
  releasesUrl: 'https://github.com/Gaganpraveen/cyberlab-studio/releases/latest',
  /** Whether a release with installers is out; the download links appear only then. */
  desktopReleased: false as boolean,
} as const;

/** GitHub's web editor for a file in the repository, e.g. "content/lessons/app-01.md". */
export function editOnGitHubUrl(path: string): string {
  return `${SITE.repoUrl}/edit/${SITE.contentBranch}/${path.replace(/^\/+/, '')}`;
}
