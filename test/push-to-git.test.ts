import { pushToGit } from '../src';
import {
  createLocalRepo,
  generateTestArchive,
  generateTestFiles,
  getCommitLogs,
} from './helpers';

describe('Push To Git', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await createLocalRepo();
  });

  test('pushToGit(src, repo)', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo);

    const logs = await getCommitLogs(repo);
    expect(logs).toMatchSnapshot();
  });

  test('pushToGit(src, repo, { name, email })', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo, {
      name: 'test',
      email: 'test@example.com',
    });

    const logs = await getCommitLogs(repo);
    expect(logs).toMatchSnapshot();
  });

  test('pushToGit(src, repo, { extact })', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo, { extract: false });

    const nonArchiveLogs = await getCommitLogs(repo);
    expect(nonArchiveLogs).toMatchSnapshot();

    const archive = await generateTestArchive();
    await pushToGit(archive, repo, { extract: true });

    const archiveLogs = await getCommitLogs(repo);
    expect(archiveLogs).toMatchSnapshot();

    expect(archiveLogs).toBe(nonArchiveLogs);
  });

  test('pushToGit(src, repo, { maxFileSize })', async () => {
    const files = await generateTestFiles();
    await pushToGit(files, repo, { maxFileSize: 99 });

    const logs = await getCommitLogs(repo);
    expect(logs).toMatchSnapshot();
  });

  test('Repeat pushToGit(src, repo)', async () => {
    for (let i = 0; i < 3; i++) {
      const files = await generateTestFiles(i);
      await pushToGit(files, repo);

      const logs = await getCommitLogs(repo);
      expect(logs).toMatchSnapshot();
    }
  });
});
