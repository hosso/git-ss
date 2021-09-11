# git-ss

Save a snapshot of a directory to git.

## Installation

```sh
npm install git-ss
# or
yarn add git-ss
```

## Usage

### CommonJS

```js
const { pushToGit } = require('git-ss');

async function takeSnapshot() {
  await pushToGit('./mydata', 'https://github.com/hosso/mybackup.git');
}

takeSnapshot();
```

### TypeScript

```ts
import { pushToGit } from 'git-ss';

async function takeSnapshot() {
  await pushToGit('./mydata', 'https://github.com/hosso/mybackup.git');
}

takeSnapshot();
```

## License

[MIT](LICENSE)
