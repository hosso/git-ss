import { pushToGit } from '../src';
import {
  changeToWorkingDir,
  createLocalRepo,
  generateTestFiles,
  getCommitLogs,
} from './helpers';

describe('Push To Git', () => {
  let repo: string;

  beforeEach(async () => {
    await changeToWorkingDir();
    repo = await createLocalRepo();
  });

  test('pushToGit(src, repo)', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo);

    const logs = await getCommitLogs();
    expect(logs).toMatchSnapshot();
  });

  test('pushToGit(src, repo, { name, email }', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo, {
      name: 'test',
      email: 'test@example.com',
    });

    const logs = await getCommitLogs();
    expect(logs).toMatchSnapshot();
  });

  test('Repeat pushToGit(src, repo)', async () => {
    for (let i = 0; i < 3; i++) {
      const files = await generateTestFiles(i);
      await pushToGit(files, repo);

      const logs = await getCommitLogs();
      expect(logs).toMatchSnapshot();
    }
  });
});
