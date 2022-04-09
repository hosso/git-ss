import archiver from 'archiver';
import execa from 'execa';
import faker from 'faker';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { v4 as uuid } from 'uuid';

let workingDir: string | null = null;

export async function setUpWorkingDir(): Promise<void> {
  if (workingDir) return;

  workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ss-test-'));
  await fs.ensureDir(workingDir);

  process.chdir(workingDir);
}

export async function tearDownWorkingDir(): Promise<void> {
  if (!workingDir) return;

  await fs.remove(workingDir);
  workingDir = null;
}

export async function createLocalRepo(): Promise<string> {
  const bareDir = uuid();
  await execa('git', ['init', '--bare', bareDir]);
  return bareDir;
}

export async function getCommitLogs(repo: string): Promise<string> {
  const tempDir = uuid();
  await execa('git', ['clone', repo, tempDir]);
  const { stdout } = await execa('git', ['log', '-p'], {
    cwd: tempDir,
  });

  // Conceal changing text, then return it
  return (
    stdout
      // Commit hash strings like "d67741b3f24fdda7303fe3ce05bb784be030eb0e"
      .replace(/[0-f]{40}/g, '*'.repeat(40))
      // Date strings like "Thu Dec 31 23:59:59 2020 +0900"
      .replace(
        /[A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4} \+\d{4}/g,
        '*** *** ** **:**:** **** +****',
      )
      // Subject strings like "2020-12-31T23:59:59.999Z"
      .replace(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g,
        '****-**-**T**:**:**.***Z',
      )
  );
}

export async function generateTestFiles(seed = 123): Promise<string> {
  const dataDir = uuid();

  faker.seed(seed);

  for (let index = 0; index < 10; index++) {
    const filePath = path.join(dataDir, faker.system.filePath());
    await fs.ensureFile(filePath);
    await fs.appendFile(filePath, faker.lorem.paragraph() + '\n');
  }

  for (const ext of ['zip', 'mp4', 'jpg']) {
    const filePath = path.join(
      dataDir,
      faker.system.directoryPath(),
      faker.system.fileName().replace(/[^.]+$/, ext),
    );
    console.log(filePath);
    await fs.ensureFile(filePath);
    await fs.appendFile(filePath, faker.lorem.paragraph() + '\n');
  }

  return dataDir;
}

export async function generateTestArchive(seed?: number): Promise<string> {
  const dataDir = await generateTestFiles(seed);

  const arcFile = uuid();
  const output = fs.createWriteStream(arcFile);

  const archive = archiver('zip');
  archive.pipe(output);
  archive.directory(dataDir, false);
  archive.finalize();

  await new Promise((resolve, reject) =>
    output.on('close', resolve).on('error', reject),
  );

  return arcFile;
}

export async function generateFixedSizeArchive(
  size = 1 * 1024 * 1024 /* 1MB */,
): Promise<string> {
  const arcFile = uuid();
  const output = fs.createWriteStream(arcFile);

  const archive = archiver('zip', {
    zlib: { level: 0 },
  });
  archive.pipe(output);

  let index = 0;
  while (size > 0) {
    const length = Math.min(size, 1 * 1024 * 1024 * 1024 /* 1GB */);
    const name = `file[${index}].bin`;
    archive.append(Buffer.alloc(length), { name });
    size -= length;
    index++;
  }

  archive.finalize();

  await new Promise((resolve, reject) =>
    output.on('close', resolve).on('error', reject),
  );

  return arcFile;
}
