process.env.SLS_STAGE = process.env.SLS_STAGE || 'local';

import { inviteEntity } from '../src/data/entities';

const [email, role = 'member'] = process.argv.slice(2);

const main = async (): Promise<void> => {
  if (!email || !['creator', 'member', 'admin'].includes(role)) {
    console.error('usage: yarn invite <email> [creator|member|admin]');
    process.exit(1);
  }
  await inviteEntity
    .upsert({
      email: email.toLowerCase(),
      role: role as 'creator' | 'member' | 'admin',
      invitedBy: { sub: 'local-script', name: 'Local script' },
      createdAt: new Date().toISOString(),
    })
    .go();
  console.log(`invited ${email.toLowerCase()} as ${role}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
