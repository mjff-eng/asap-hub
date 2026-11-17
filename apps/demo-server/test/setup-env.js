// runs before any module loads, once per test file. Values are assigned
// unconditionally so a stray var in the developer's shell cannot change the
// result; a test file that needs different values overrides them at its top.
process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';
