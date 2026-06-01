export type GitHubRemote = {
  owner: string;
  repo: string;
  webUrl: string;
  commitUrl: (hash: string) => string;
};

const OWNER = String.raw`(?<owner>[A-Za-z0-9_.-]+)`;
const REPO = String.raw`(?<repo>[A-Za-z0-9_.-]+?)(?:\.git)?`;

const HTTPS_GITHUB_REMOTE = new RegExp(
  String.raw`^(?:https?:\/\/)(?:[^@\/\n]+@)?(?:www\.)?github\.com[:/]${OWNER}\/+${REPO}\/?$`
);
const SSH_GITHUB_REMOTE = new RegExp(String.raw`^git@github\.com:${OWNER}\/${REPO}$`);
const SSH_URL_GITHUB_REMOTE = new RegExp(String.raw`^ssh:\/\/git@github\.com\/${OWNER}\/${REPO}\/?$`);

export function parseGitHubRemote(remoteUrl: string): GitHubRemote | null {
  const normalizedRemoteUrl = remoteUrl.trim();
  const httpsMatch = HTTPS_GITHUB_REMOTE.exec(normalizedRemoteUrl);
  if (httpsMatch?.groups) {
    return buildGitHubRemote(httpsMatch.groups.owner, httpsMatch.groups.repo);
  }

  const sshMatch =
    SSH_GITHUB_REMOTE.exec(normalizedRemoteUrl) || SSH_URL_GITHUB_REMOTE.exec(normalizedRemoteUrl);
  if (sshMatch?.groups) {
    return buildGitHubRemote(sshMatch.groups.owner, sshMatch.groups.repo);
  }

  return null;
}

function buildGitHubRemote(owner: string, repo: string): GitHubRemote {
  const normalizedRepo = repo.replace(/\.git$/, "");
  const webUrl = `https://github.com/${owner}/${normalizedRepo}`;

  const result: GitHubRemote = {
    owner,
    repo: normalizedRepo,
    webUrl,
    commitUrl: () => webUrl,
  };

  Object.defineProperty(result, "commitUrl", {
    configurable: true,
    enumerable: false,
    value(hash: string) {
      return `${webUrl}/commit/${hash}`;
    },
    writable: true,
  });

  return result;
}
