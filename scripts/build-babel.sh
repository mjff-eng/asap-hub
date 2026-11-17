#!/usr/bin/env sh
set -eu

# -D copies whatever babel cannot compile, and --ignore does not apply to that
# copy, so jest's snapshot fixtures end up inside the build. They are test data
# rather than package contents, and jest fails the build output run when it
# finds them there with no test to claim them.
drop_test_fixtures() {
  find "$1" -type d -name __snapshots__ -exec rm -rf {} + 2>/dev/null || true
}

BUILD_CMD='babel src -Dd build -x .js,.jsx,.ts,.tsx --ignore="src/**/*.test.ts","src/**/*.test.tsx" --no-copy-ignored --source-maps inline --root-mode upward'
BUILD_CJS_CMD='babel src -Dd build-cjs -x .js,.jsx,.ts,.tsx --ignore="src/**/*.test.ts","src/**/*.test.tsx" --no-copy-ignored --source-maps inline --config-file=$(yarn workspace asap-hub node -p "process.cwd()")/babel-cjs.config.js'

case $1 in
  build)
    echo Building ESM
    eval $BUILD_CMD &
    echo Building CJS
    eval $BUILD_CJS_CMD &
    wait
    drop_test_fixtures build
    drop_test_fixtures build-cjs
  ;;
  watch)
    echo Watching ESM
    eval $BUILD_CMD -w --verbose --skip-initial-build &
    echo Watching CJS
    eval $BUILD_CJS_CMD -w --verbose --skip-initial-build &
    wait
  ;;
  *)
    exec false
  ;;
esac
