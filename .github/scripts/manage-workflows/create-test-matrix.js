const { execSync } = require('child_process');

// Packages that should be sharded (with their shard count)
const SHARDED_PACKAGES = {
  '@asap-hub/crn-frontend': 8, // Update as needed based on the number of tests in the package
  '@asap-hub/react-components': 6, // Update as needed based on the number of tests in the package
  '@asap-hub/gp2-frontend': 4,
};

// On pull requests, GITHUB_BASE_REF holds the target branch. We use it to gate
// Turbo's --affected flag so PRs only test packages touched by the diff (plus
// their dependents); pushes to a branch keep running the full suite so the
// coverage baseline stays complete.
const isPullRequest = Boolean(process.env.GITHUB_BASE_REF);

// run turborepo dry run to get the list of runnable test tasks
const getRunnableTasks = (affected) => {
  const affectedFlag = affected ? ' --affected' : '';
  const { tasks } = JSON.parse(
    execSync(
      `yarn turbo test --only${affectedFlag} --filter="!@asap-hub/contentful-app-*" --dry-run=json`,
    ).toString(),
  );
  return tasks.filter((task) => task.command !== '<NONEXISTENT>');
};

let runnableTasks = getRunnableTasks(isPullRequest);

// A PR that touches no testable package (e.g. docs/CI only) yields an empty
// affected set. Fall back to the full suite so downstream coverage/merge jobs
// always have artifacts and never skip a required check.
if (isPullRequest && runnableTasks.length === 0) {
  runnableTasks = getRunnableTasks(false);
}

// create a matrix of tasks
const taskList = runnableTasks.flatMap(({ package }) => {
  const shardCount = SHARDED_PACKAGES[package];

  if (shardCount) {
    // Create multiple shards for this package
    const shards = [];
    for (let shardIndex = 1; shardIndex <= shardCount; shardIndex++) {
      shards.push({
        package,
        shard: `${shardIndex}/${shardCount}`,
        shardIndex,
        shardCount,
      });
    }
    return shards;
  }

  // Regular package without sharding
  return [{ package }];
});

// print the matrix, stringify the json
console.log(`${JSON.stringify({ include: taskList })}`);
