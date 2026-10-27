process.env.SLS_STAGE = process.env.SLS_STAGE || 'local';

import { userEntity } from '../src/data/entities';

const [email] = process.argv.slice(2);

const main = async (): Promise<void> => {
  if (!email) {
    console.error('usage: ts-node ./scripts/promote-admin.ts <email>');
    process.exit(1);
  }
  const { data } = await userEntity.query.all({}).go({ pages: 'all' });
  const user = data.find((row) => row.email === email.toLowerCase());
  if (!user) {
    console.error(`no USER row for ${email}`);
    process.exit(1);
  }
  console.log('before:', JSON.stringify(user));
  await userEntity.patch({ sub: user.sub }).set({ role: 'admin' }).go();
  const after = await userEntity.get({ sub: user.sub }).go();
  console.log('after:', JSON.stringify(after.data));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
