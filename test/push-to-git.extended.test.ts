import { pushToGit } from '../src';
import {
  createLocalRepo,
  generateFixedSizeArchive,
  getCommitLogs,
} from './helpers';

describe('Push To Git (Large Archive)', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await createLocalRepo();
  });

  test(
    'pushToGit(src, repo, { extact: true })',
    async () => {
      const archive = await generateFixedSizeArchive(
        2 * 1024 * 1024 * 1024 /* 2GB */,
      );
      await pushToGit(archive, repo, { extract: true });

      const logs = await getCommitLogs(repo);
      expect(logs).toMatchSnapshot();
    },
    10 * 60 * 1000,
  );
});
