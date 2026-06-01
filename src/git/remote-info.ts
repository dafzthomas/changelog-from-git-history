import { runGit } from "./git.js";
import { parseGitHubRemote, type GitHubRemote } from "./remote.js";

export async function getOriginGitHubRemote(cwd: string): Promise<GitHubRemote | null> {
  try {
    const remoteUrl = (await runGit(["config", "--get", "remote.origin.url"], cwd)).trim();
    return parseGitHubRemote(remoteUrl);
  } catch {
    return null;
  }
}
