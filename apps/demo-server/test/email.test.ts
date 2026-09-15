/* eslint-disable import/first */
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { isLocal } from '../src/config';
import { sendInviteEmail, setSesClient } from '../src/email';
/* eslint-enable import/first */

jest.mock('../src/config', () => ({
  isLocal: jest.fn(),
  getDemoHostname: () => 'demos.example.org',
  getEmailSender: () => 'ASAP Demos <no-reply@demos.example.org>',
  getSesRegion: () => 'eu-west-1',
}));

const mockIsLocal = isLocal as jest.MockedFunction<typeof isLocal>;

const send = jest.fn();

beforeEach(() => {
  send.mockReset().mockResolvedValue({});
  mockIsLocal.mockReturnValue(false);
  setSesClient({ send } as unknown as SESClient);
});

afterEach(() => {
  setSesClient(undefined);
  jest.restoreAllMocks();
});

const sentCommand = (): SendEmailCommand => send.mock.calls[0]![0];

describe('sendInviteEmail when deployed', () => {
  it('sends from the configured sender to the invited address', async () => {
    await sendInviteEmail('bob@example.com');

    expect(send).toHaveBeenCalledTimes(1);
    const command = sentCommand();
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input.Source).toBe(
      'ASAP Demos <no-reply@demos.example.org>',
    );
    expect(command.input.Destination).toEqual({
      ToAddresses: ['bob@example.com'],
    });
  });

  it('uses an invitation subject', async () => {
    await sendInviteEmail('bob@example.com');

    const subject = sentCommand().input.Message!.Subject!;
    expect(subject.Data).toBe(
      'You have been invited to the ASAP <> YLD Demos platform',
    );
    expect(subject.Data).toMatch(/invited/i);
    expect(subject.Charset).toBe('UTF-8');
  });

  it('sends both a text and an html body carrying the app url and address', async () => {
    await sendInviteEmail('bob@example.com');

    const body = sentCommand().input.Message!.Body!;

    expect(body.Text!.Charset).toBe('UTF-8');
    expect(body.Html!.Charset).toBe('UTF-8');

    expect(body.Text!.Data).toContain('https://demos.example.org');
    expect(body.Text!.Data).toContain('bob@example.com');
    expect(body.Text!.Data).toContain('Google');

    expect(body.Html!.Data).toContain(
      '<a href="https://demos.example.org">https://demos.example.org</a>',
    );
    expect(body.Html!.Data).toContain('bob@example.com');
    expect(body.Html!.Data).toMatch(/^<p>/);
  });

  it('propagates a send failure to the caller', async () => {
    send.mockRejectedValue(new Error('MessageRejected'));

    await expect(sendInviteEmail('bob@example.com')).rejects.toThrow(
      'MessageRejected',
    );
  });
});

describe('sendInviteEmail when local', () => {
  it('logs the invite instead of calling SES', async () => {
    mockIsLocal.mockReturnValue(true);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await sendInviteEmail('bob@example.com');

    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const message = log.mock.calls[0]![0] as string;
    expect(message).toContain('[local] invite email to bob@example.com');
    expect(message).toContain(
      'You have been invited to the ASAP <> YLD Demos platform',
    );
  });
});
