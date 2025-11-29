import AutoGitUpdate from 'auto-git-update';
import os from 'os';

const config = {
    repository: 'https://github.com/pap-git/gs2009',
    branch: 'dev',
    tempLocation: os.tmpdir()
}

const updater = new AutoGitUpdate(config);
updater.autoUpdate();