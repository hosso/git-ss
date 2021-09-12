import { SimpleGit } from 'simple-git';

const original = jest.requireActual('simple-git');

// (await simpleGit().listConfig).all = {}
export default function (): SimpleGit {
  const git = original.default();
  git.listConfig = async () => ({ all: {} });
  return git;
}
