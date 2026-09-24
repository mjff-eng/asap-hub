import {
  isServerValidationError,
  UserPatchRequest,
  UserResponse,
} from '@asap-hub/model';
import {
  crnEmailExpression,
  urlExpression,
  USER_SOCIAL_RESEARCHER_ID,
} from '@asap-hub/validation';
import { css } from '@emotion/react';
import { FunctionComponent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Link } from '../atoms';
import { neutral900, colour } from '../colors';
import {
  BlueSkyIcon,
  GithubIcon,
  GlobeIcon,
  GoogleScholarIcon,
  LinkedInIcon,
  OrcidSocialIcon,
  ResearcherIdIcon,
  ResearchGateIcon,
  XIcon,
} from '../icons';
import { mailToSupport } from '../mail';
import { rem } from '../pixels';
import { FormSection, LabeledTextField } from '../molecules';
import { EditUserModal } from '../organisms';
import { formatUserSocial, noop } from '../utils';

const iconStyles = css({
  width: 24,
  display: 'inline-flex',
  textAlign: 'center',
  alignItems: 'center',
});

const iconCSS = css({
  '& > svg > path:first-of-type': { fill: 'transparent' },
});

const wrapIcon = (
  Icon: FunctionComponent<{ color?: string }>,
  adjustBackground?: boolean,
) => (
  <span css={[iconStyles, adjustBackground ? iconCSS : {}]}>
    <Icon color={neutral900.hex} />
  </span>
);

type ContactInfoModalProps = {
  readonly email?: string;
  readonly personalEmail?: string;

  readonly fallbackEmail: string;

  readonly backHref: string;
  readonly onSave?: (data: UserPatchRequest) => void | Promise<void>;
} & Pick<UserResponse, 'social'>;
export const invalidEmailMessage =
  'Enter a valid email address, for example name@gmail.com.';

// Defer to the browser's own message ("A part following '@' should not contain
// the symbol '+'.") and to the server's, both more specific than this one.
const emailValidationMessage = ({
  typeMismatch,
  customError,
}: ValidityState) =>
  typeMismatch || customError ? undefined : invalidEmailMessage;

// Gives the hint below the input 16 to clear the validation message, instead of
// the 6 it uses when sitting directly under the input.
//
// Keyed on the message being non-empty rather than on `input:invalid`, which is
// already true for a required field on first render and would move the hint with
// nothing on screen. The message is the last div TextField renders after the
// input, and it collapses when empty.
// Wraps the field rather than reaching into LabeledTextField: its
// `overrideStyles` prop is dead, and applying it would silently activate a
// dormant style in DiscussionModal, which passes it too.
const emailFieldStyles = css({
  '> div:has(input ~ div:last-of-type:not(:empty)) > div:last-of-type': {
    paddingTop: rem(16),
  },
});

const emailFields = ['contactEmail', 'personalEmail'] as const;
type EmailField = (typeof emailFields)[number];

// Exported so the caller wiring toServerValidationError uses the same list this
// modal can render. A path it cannot map produces a save that reports nothing.
export const contactInfoServerErrorPaths = emailFields.map(
  (field) => `/${field}`,
);

const emailFieldForInstancePath = (instancePath: string) =>
  emailFields.find((field) => `/${field}` === instancePath);

const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  email = '',
  personalEmail = '',
  fallbackEmail,
  social: {
    website1 = '',
    website2 = '',
    orcid = '',
    github = '',
    linkedIn = '',
    googleScholar = '',
    researchGate = '',
    researcherId = '',
    twitter = '',
    blueSky = '',
  } = {},

  backHref,
  onSave = noop,
}) => {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState(email);
  const [newPersonalEmail, setNewPersonalEmail] = useState(personalEmail);
  const [newWebsite1, setNewWebsite1] = useState(website1);
  const [newWebsite2, setNewWebsite2] = useState(website2);
  const [newOrcid, setNewOrcid] = useState(orcid);
  const [newGithub, setNewGithub] = useState(github);
  const [newLinkedIn, setNewLinkedIn] = useState(linkedIn);
  const [newGoogleScholar, setNewGoogleScholar] = useState(googleScholar);
  const [newResearchGate, setNewResearchGate] = useState(researchGate);
  const [newResearcherId, setNewResearcherId] = useState(researcherId);
  const [newTwitter, setNewTwitter] = useState(twitter);
  const [newBlueSky, setNewBlueSky] = useState(blueSky);
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<EmailField, string>>
  >({});

  // Both fields clear, not just the edited one: a server error goes through
  // setCustomValidity, and EditModal gates the whole save on reportValidity(),
  // so a stale error on one email blocks the save that would report the other.
  // The round-trip re-reports whatever is still wrong.
  const clearServerErrors = () =>
    setServerErrors((current) =>
      Object.keys(current).length === 0 ? current : {},
    );

  return (
    <EditUserModal
      backHref={backHref}
      title="Contact Details"
      // Every edited field, not just the emails: EditModal only warns on unsaved
      // changes when `dirty`, so a narrower check loses a website edit silently
      // once a rejected email puts the modal back in its `initial` state.
      dirty={
        newEmail !== email ||
        newPersonalEmail !== personalEmail ||
        newWebsite1 !== website1 ||
        newWebsite2 !== website2 ||
        newGithub !== github ||
        newLinkedIn !== linkedIn ||
        newGoogleScholar !== googleScholar ||
        newResearchGate !== researchGate ||
        newResearcherId !== researcherId ||
        newTwitter !== twitter ||
        newBlueSky !== blueSky
      }
      onSave={async () => {
        clearServerErrors();
        try {
          await onSave({
            contactEmail: newEmail,
            personalEmail: newPersonalEmail,
            social: {
              twitter: formatUserSocial(newTwitter, 'twitter') || undefined,
              blueSky: formatUserSocial(newBlueSky, 'blueSky') || undefined,
              researcherId: newResearcherId || undefined,
              researchGate:
                formatUserSocial(newResearchGate, 'researchGate') || undefined,
              github: formatUserSocial(newGithub, 'github') || undefined,
              googleScholar:
                formatUserSocial(newGoogleScholar, 'googleScholar') ||
                undefined,
              linkedIn: formatUserSocial(newLinkedIn, 'linkedIn') || undefined,
              website1: newWebsite1 || undefined,
              website2: newWebsite2 || undefined,
            },
          });
        } catch (error) {
          if (!isServerValidationError(error)) throw error;

          const messages: Partial<Record<EmailField, string>> = {};
          error.validationErrors.forEach(({ instancePath }) => {
            const field = emailFieldForInstancePath(instancePath);
            if (field) messages[field] = invalidEmailMessage;
          });

          if (Object.keys(messages).length === 0) {
            // Nothing is on screen, and EditModal drops its toast for a
            // ServerValidationError — so downgrade to keep the generic report.
            throw new Error(error.message, { cause: error });
          }

          setServerErrors(messages);
          // EditModal treats a resolved promise as a save and navigates away.
          throw error;
        }
        void navigate(backHref);
      }}
    >
      {({ isSaving }) => (
        <FormSection>
          <div css={emailFieldStyles}>
            <LabeledTextField
              type="email"
              value={newEmail}
              onChange={(value) => {
                setNewEmail(value);
                clearServerErrors();
              }}
              enabled={!isSaving}
              // The browser ANDs its own address check with `pattern`, so this
              // adds the content model's rule on top of type="email" rather than
              // replacing it: test@test passes the browser and fails here.
              pattern={crnEmailExpression}
              customValidationMessage={serverErrors.contactEmail ?? ''}
              getValidationMessage={emailValidationMessage}
              title="Contact email"
              subtitle="(optional)"
              description={
                <>
                  People in the ASAP Network will contact you using{' '}
                  <strong css={{ color: colour.foreground.primary }}>
                    {fallbackEmail}
                  </strong>
                  . To use a different correspondence email address, please add
                  it below.
                </>
              }
              hint="Note: This will not affect the way you login into the Hub."
              placeholder="Add a different email"
            />
          </div>
          <div css={emailFieldStyles}>
            <LabeledTextField
              type="email"
              value={newPersonalEmail}
              onChange={(value) => {
                setNewPersonalEmail(value);
                clearServerErrors();
              }}
              enabled={!isSaving}
              pattern={crnEmailExpression}
              customValidationMessage={serverErrors.personalEmail ?? ''}
              getValidationMessage={emailValidationMessage}
              title="Personal Email"
              subtitle="(optional)"
              description="Enter a permanent personal email (e.g., Gmail or Yahoo) where we can reach you once you transition to a CRN alum. Because alumni lose access to the CRN Hub, ASAP staff may use this information to keep in touch."
              hint="Note: This address is hidden from the community and will not appear on your profile. Only administrative staff will have access."
              placeholder="Add a personal email"
            />
          </div>
          <LabeledTextField
            title="Website 1"
            subtitle="(optional)"
            pattern={urlExpression}
            getValidationMessage={() =>
              'Please enter a valid URL, starting with http://'
            }
            onChange={setNewWebsite1}
            value={newWebsite1}
            enabled={!isSaving}
            labelIndicator={<GlobeIcon />}
            placeholder="https://example.com"
          />
          <LabeledTextField
            title="Website 2"
            subtitle="(optional)"
            pattern={urlExpression}
            getValidationMessage={() =>
              'Please enter a valid URL, starting with http://'
            }
            onChange={setNewWebsite2}
            value={newWebsite2}
            enabled={!isSaving}
            labelIndicator={<GlobeIcon />}
            placeholder="https://example.com"
          />

          <FormSection title="Social Networks">
            <LabeledTextField
              hint={
                <>
                  To change your ORCID please{' '}
                  <Link
                    href={mailToSupport({
                      subject: `Orcid change for "${orcid}"`,
                    })}
                  >
                    contact ASAP
                  </Link>
                </>
              }
              title="ORCID"
              onChange={setNewOrcid}
              value={newOrcid}
              enabled={false}
              labelIndicator={wrapIcon(OrcidSocialIcon)}
              placeholder="0000-0000-0000-0000"
            />
            <LabeledTextField
              title="Researcher ID"
              subtitle="(optional)"
              description="Type your Researcher ID."
              pattern={USER_SOCIAL_RESEARCHER_ID.source}
              getValidationMessage={() => 'Please enter a valid Researcher ID'}
              onChange={setNewResearcherId}
              value={newResearcherId}
              enabled={!isSaving}
              labelIndicator={wrapIcon(ResearcherIdIcon, true)}
              placeholder="0-0000-0000"
            />
            <LabeledTextField
              title="X"
              subtitle="(optional)"
              description="Type your X (formerly Twitter) profile URL."
              onChange={setNewTwitter}
              value={newTwitter}
              enabled={!isSaving}
              labelIndicator={wrapIcon(XIcon)}
              placeholder="https://twitter.com/yourprofilename"
            />
            <LabeledTextField
              title="BlueSky"
              subtitle="(optional)"
              description="Type your BlueSky profile URL."
              onChange={setNewBlueSky}
              value={newBlueSky}
              enabled={!isSaving}
              labelIndicator={wrapIcon(BlueSkyIcon)}
              placeholder="https://bsky.app/profile/yourprofilename"
            />
            <LabeledTextField
              title="Github"
              subtitle="(optional)"
              description="Type your Github profile URL."
              onChange={setNewGithub}
              value={newGithub}
              enabled={!isSaving}
              labelIndicator={wrapIcon(GithubIcon, true)}
              placeholder="https://github.com/yourprofilename"
            />
            <LabeledTextField
              title="LinkedIn"
              subtitle="(optional)"
              description="Type your LinkedIn profile URL."
              onChange={setNewLinkedIn}
              value={newLinkedIn}
              enabled={!isSaving}
              labelIndicator={wrapIcon(LinkedInIcon, true)}
              placeholder="https://www.linkedin.com/in/yourprofilename"
            />
            <LabeledTextField
              title="Research Gate"
              subtitle="(optional)"
              description="Type your Research Gate profile URL."
              onChange={setNewResearchGate}
              value={newResearchGate}
              enabled={!isSaving}
              labelIndicator={wrapIcon(ResearchGateIcon, true)}
              placeholder="https://www.researchgate.net/profile/profileID"
            />
            <LabeledTextField
              title="Google Scholar"
              subtitle="(optional)"
              description="Type your Google Scholar profile URL."
              onChange={setNewGoogleScholar}
              value={newGoogleScholar}
              enabled={!isSaving}
              labelIndicator={wrapIcon(GoogleScholarIcon, true)}
              placeholder="https://scholar.google.com/citations?user=profileID"
            />
          </FormSection>
        </FormSection>
      )}
    </EditUserModal>
  );
};

export default ContactInfoModal;
