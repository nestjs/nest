const core = require('@actions/core');
const exec = require('@actions/exec');

async function run() {
  try {
    // Install dependencies
    await exec.exec('npm', ['install']);

    // Run npm audit
    await exec.exec('npm', ['audit']);

    // Read npm-audit.json file
    const fs = require('fs');
    const auditFile = fs.readFileSync('npm-audit.json');

    // Fail pull request if there are high severity issues
    if (auditFile.includes('"severity":"high"')) {
      core.setFailed('There are high severity issues in npm audit');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
