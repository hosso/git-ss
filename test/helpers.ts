import execa from 'execa';
import faker from 'faker';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

const TEST_BARE_REPO = 'myrepo.git';
const TEST_REPO = 'myrepo';
const TEST_FILES = 'mydata';

export async function changeToWorkingDir(): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-ss-test-'));
  await fs.emptyDir(tempDir);
  process.chdir(tempDir);
}

export async function createLocalRepo(): Promise<string> {
  await execa('git', ['init', '--bare', TEST_BARE_REPO]);
  return TEST_BARE_REPO;
}

export async function getCommitLogs(): Promise<string> {
  await fs.remove(TEST_REPO);
  await execa('git', ['clone', TEST_BARE_REPO, TEST_REPO]);
  const { stdout } = await execa('git', ['log', '-p'], {
    cwd: TEST_REPO,
  });

  // Conceal changing text, then return it
  return stdout
    .replace(
      /((?:commit|Date:)\s*)([^\n]+)/g,
      (_match: string, p1: string, p2: string) =>
        `${p1}${'*'.repeat(p2.length)}`,
    )
    .replace(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g,
      '****-**-**T**:**:**.***Z',
    );
}

export async function generateTestFiles(seed = 123): Promise<string> {
  faker.seed(seed);

  await fs.emptyDir(TEST_FILES);
  for (let index = 0; index < 10; index++) {
    const filePath = path.join(TEST_FILES, faker.system.filePath());
    await fs.ensureFile(filePath);
    await fs.appendFile(filePath, faker.lorem.paragraph() + '\n');
  }

  return TEST_FILES;
}
