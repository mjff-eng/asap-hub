import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import {
  getDemoHostname,
  getEmailSender,
  getSesRegion,
  isLocal,
} from './config';

const subject = 'You have been invited to the ASAP <> YLD Demos platform';

let client: SESClient | undefined;

const getClient = (): SESClient => {
  if (!client) {
    client = new SESClient({ region: getSesRegion() });
  }
  return client;
};

export const setSesClient = (next: SESClient | undefined): void => {
  client = next;
};

export const sendInviteEmail = async (email: string): Promise<void> => {
  const appUrl = `https://${getDemoHostname()}`;
  const text = [
    'You have been invited to the ASAP <> YLD Demos platform, where sprint',
    'demo recordings are shared and reviewed.',
    '',
    `Create your account at ${appUrl} using this exact email address (${email}).`,
    'You can sign in with Google or with an email and password.',
  ].join('\n');
  const html = [
    '<p>You have been invited to the ASAP &lt;&gt; YLD Demos platform, where sprint demo recordings are shared and reviewed.</p>',
    `<p>Create your account at <a href="${appUrl}">${appUrl}</a> using this exact email address (${email}).</p>`,
    '<p>You can sign in with Google or with an email and password.</p>',
  ].join('');

  if (isLocal()) {
    // eslint-disable-next-line no-console
    console.log(
      `[local] invite email to ${email}: ${JSON.stringify({ subject, text })}`,
    );
    return;
  }

  await getClient().send(
    new SendEmailCommand({
      Source: getEmailSender(),
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
    }),
  );
};
