import execa from 'execa';
import fs from 'fs-extra';
import globby from 'globby';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

type Options = {
  name?: string;
  email?: string;
  maxFileSize?: number;
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

async function copyAndSplit(src: string, dest: string, chunkSize: number) {
  await fs.copy(src, dest);

  await execa('split', [
    '-b',
    chunkSize.toString(),
    dest,
    dest.concat('.part'),
  ]);

  await fs.remove(dest);
}

async function copyFiles(src: string, targetDir: string, options?: Options) {
  const maxFileSize = options?.maxFileSize || /*50GB*/ 50 * 1024 * 1024;

  const oldFiles = await globby(['*', '!.git'], {
    cwd: targetDir,
    onlyFiles: false,
  });
  await Promise.all(
    oldFiles.map(async (file) => fs.remove(path.join(targetDir, file))),
  );

  const newFiles = await globby(['**/*'], { cwd: src });
  await Promise.all(
    newFiles.map(async (file) => {
      const srcPath = path.join(src, file);
      const destPath = path.join(targetDir, file);

      const stat = await fs.stat(srcPath);
      if (stat.size > maxFileSize) {
        await copyAndSplit(srcPath, destPath, maxFileSize);
      } else {
        await fs.copy(srcPath, destPath);
      }
    }),
  );
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

  await copyFiles(src, repoDir, options);

  await commitAndPush(git);
}
