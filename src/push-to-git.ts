import fs from 'fs-extra';
import globby from 'globby';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

type Options = {
  name?: string;
  email?: string;
};

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ss-'));
  await fs.emptyDir(tempDir);
  return tempDir;
}

async function clone(repoDir: string, repo: string) {
  await fs.remove(repoDir);
  const git = simpleGit();
  await git.clone(repo, repoDir, ['--depth', '1']);
  await git.cwd({ path: repoDir, root: true });
  return git;
}

async function configureUser(git: SimpleGit, options?: Options) {
  let [name, email] = [options?.name, options?.email];

  if (!name || !email) {
    const configs = (await git.listConfig()).all;
    name = name || (configs['user.name'] as string) || 'somebody';
    email =
      email || (configs['user.email'] as string) || 'somebody@example.com';
  }

  await git.addConfig('user.name', name);
  await git.addConfig('user.email', email);
}

async function copyFiles(src: string, targetDir: string) {
  const files = await globby(['*', '!.git'], {
    cwd: targetDir,
    onlyFiles: false,
  });
  await Promise.all(
    files.map(async (file) => fs.remove(path.join(targetDir, file))),
  );
  await fs.copy(src, targetDir);
}

async function commitAndPush(git: SimpleGit) {
  await git.add('*');
  await git.commit(new Date().toISOString()); // e.g. "2020-12-31T23:59:59.999Z"
  await git.push();
}

export async function pushToGit(
  src: string,
  repo: string,
  options?: Options,
): Promise<void> {
  const repoDir = await makeTempDir();

  const git = await clone(repoDir, repo);
  await configureUser(git, options);

  await copyFiles(src, repoDir);

  await commitAndPush(git);
}
