import execa from 'execa';
import fs from 'fs-extra';
import globby from 'globby';
import isArchive from 'is-archive';
import isImage from 'is-image';
import isVideo from 'is-video';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import unzip from 'unzip-stream';

type Options = {
  name?: string | null;
  email?: string | null;
  extract?: boolean;
  maxFileSize?: number;
  exclusion?: {
    archive?: boolean;
    video?: boolean;
    image?: boolean;
  };
};

const defaultOptions: Required<Options> = {
  name: null,
  email: null,
  extract: false,
  maxFileSize: /*50MB*/ 50 * 1024 * 1024,
  exclusion: {
    archive: false,
    video: false,
    image: false,
  },
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

async function configureUser(git: SimpleGit, opts: Required<Options>) {
  let [name, email] = [opts.name, opts.email];

  if (!name || !email) {
    const configs = (await git.listConfig()).all;
    name = name || (configs['user.name'] as string) || 'somebody';
    email =
      email || (configs['user.email'] as string) || 'somebody@example.com';
  }

  await git.addConfig('user.name', name);
  await git.addConfig('user.email', email);
}

async function ExtractArchive(src: string) {
  const extractedDir = await makeTempDir();
  const stream = fs.createReadStream(src);
  stream.pipe(unzip.Extract({ path: extractedDir }));
  await new Promise((resolve, reject) =>
    stream.on('close', resolve).on('error', reject),
  );
  return extractedDir;
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

async function copyFiles(
  src: string,
  targetDir: string,
  opts: Required<Options>,
) {
  if (opts.extract) {
    src = await ExtractArchive(src);
  }

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
      if (opts.exclusion.archive && isArchive(file)) return;
      if (opts.exclusion.video && isVideo(file)) return;
      if (opts.exclusion.image && isImage(file)) return;

      const srcPath = path.join(src, file);
      const destPath = path.join(targetDir, file);

      const stat = await fs.stat(srcPath);
      if (stat.size > opts.maxFileSize) {
        await copyAndSplit(srcPath, destPath, opts.maxFileSize);
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
  const opts: Required<Options> = { ...defaultOptions, ...options };
  const repoDir = await makeTempDir();

  const git = await clone(repoDir, repo);
  await configureUser(git, opts);

  await copyFiles(src, repoDir, opts);

  await commitAndPush(git);
}
