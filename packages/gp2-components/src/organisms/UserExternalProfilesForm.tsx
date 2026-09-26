import { gp2 } from '@asap-hub/model';
import {
  LabeledTextField,
  FormSection,
  colour,
} from '@asap-hub/react-components';
import { urlExpression, USER_SOCIAL_NOT_URL } from '@asap-hub/validation';
import { css, Interpolation, Theme } from '@emotion/react';
import { ComponentProps, FunctionComponent } from 'react';
import { socialIconsMap } from '../utils';

export const baseUrls = {
  orcid: 'https://orcid.org/',
  researcherId: 'https://researcherid.com/rid/',
};

const iconStyles = css({
  width: 24,
  display: 'inline-flex',
  textAlign: 'center',
  alignItems: 'center',
});

type UserExternalProfilesFormProps = {
  onChange: (payload: gp2.UserSocial) => void;
  isSaving?: boolean;
  newSocial?: gp2.UserSocial;
  social?: gp2.UserSocial;
};
const UserExternalProfilesForm: React.FC<UserExternalProfilesFormProps> = ({
  onChange,
  social,
  newSocial,
  isSaving = false,
}) => {
  const researchNetworks: (Pick<
    ComponentProps<typeof LabeledTextField>,
    'title' | 'subtitle' | 'placeholder' | 'description' | 'pattern'
  > & {
    Icon: FunctionComponent<{ color: string }>;
    iconCSS?: Interpolation<Theme>;
    key: keyof gp2.UserSocial;
  })[] = [
    {
      key: 'googleScholar',
      title: 'Google Scholar',
      description: 'Type your Google Scholar profile URL.',
      placeholder: 'https://scholar.google.com/citations?user=profileID',
      pattern: urlExpression,
      Icon: socialIconsMap.googleScholar,
      iconCSS: { '& > svg > path:first-of-type': { fill: 'transparent' } },
    },
    {
      key: 'orcid',
      title: 'ORCID',
      description: 'Type your ORCID ID.',
      placeholder: '0000-0000-0000-0000',
      pattern: USER_SOCIAL_NOT_URL.source,
      Icon: socialIconsMap.orcid,
    },
    {
      key: 'researchGate',
      title: 'Research Gate',
      description: 'Type your Research Gate profile URL.',
      placeholder: 'https://www.researchgate.net/profile/profileID',
      pattern: urlExpression,
      Icon: socialIconsMap.researchGate,
      iconCSS: { '& > svg > path:first-of-type': { fill: 'transparent' } },
    },
    {
      key: 'researcherId',
      title: 'ResearcherID',
      description: 'Type your Researcher ID.',
      placeholder: '0-0000-0000',
      pattern: USER_SOCIAL_NOT_URL.source,
      Icon: socialIconsMap.researcherId,
      iconCSS: { '& > svg > path:first-of-type': { fill: 'transparent' } },
    },
  ];

  const socialNetworks: (Pick<
    ComponentProps<typeof LabeledTextField>,
    'title' | 'placeholder' | 'description' | 'pattern'
  > & {
    Icon: FunctionComponent<{ color: string }>;
    iconCSS?: Interpolation<Theme>;
    key: keyof gp2.UserSocial;
  })[] = [
    {
      key: 'blog',
      title: 'Blog',
      placeholder: 'https://www.example.com',
      Icon: socialIconsMap.blog,
      pattern: urlExpression,
    },
    {
      key: 'blueSky',
      title: 'BlueSky',
      description: 'Type your BlueSky profile URL.',
      placeholder: 'https://bsky.app/profile/yourprofilename',
      Icon: socialIconsMap.blueSky,
      pattern: urlExpression,
    },
    {
      key: 'threads',
      title: 'Threads',
      description: 'Type your Threads profile URL.',
      placeholder: 'https://www.threads.net/@yourprofilename',
      Icon: socialIconsMap.threads,
      pattern: urlExpression,
    },
    {
      key: 'twitter',
      title: 'X',
      description: 'Type your X (formerly twitter) profile URL.',
      placeholder: 'https://twitter.com/yourprofilename',
      Icon: socialIconsMap.twitter,
      pattern: urlExpression,
    },
    {
      key: 'linkedIn',
      title: 'LinkedIn',
      description: 'Type your LinkedIn profile URL.',
      placeholder: 'https://www.linkedin.com/in/yourprofilename',
      Icon: socialIconsMap.linkedIn,
      pattern: urlExpression,
      iconCSS: {
        '& > svg > path:first-of-type': { fill: 'transparent' },
      },
    },
    {
      key: 'github',
      title: 'Github',
      description: 'Type your Github profile URL.',
      placeholder: 'https://github.com/yourprofilename',
      Icon: socialIconsMap.github,
      pattern: urlExpression,
      iconCSS: { '& > svg > path:first-of-type': { fill: 'transparent' } },
    },
  ];

  const onChangeValue = (property: keyof gp2.UserSocial) => (value: string) =>
    onChange({ ...newSocial, [property]: value } as gp2.UserSocial);

  return (
    <>
      <FormSection
        title="External Profiles"
        secondaryTitle="Research Networks"
        description="Share external profiles that are relevant to your work."
      >
        <>
          {researchNetworks.map(({ key, Icon, iconCSS, ...props }) => (
            <LabeledTextField
              key={key}
              subtitle="(optional)"
              labelIndicator={
                <span css={[iconStyles, iconCSS]}>
                  <Icon color={colour.neutral[600]} />
                </span>
              }
              enabled={!isSaving}
              value={newSocial?.[key] ?? (social?.[key] || '')}
              onChange={onChangeValue(key)}
              {...props}
            />
          ))}
        </>
      </FormSection>
      <FormSection
        secondaryTitle="Social Networks"
        description="Share external profiles that are relevant to your profession."
      >
        {socialNetworks.map(({ key, Icon, iconCSS, ...props }) => (
          <LabeledTextField
            key={key}
            subtitle="(optional)"
            labelIndicator={
              <span css={[iconStyles, iconCSS]}>
                <Icon color={colour.neutral[600]} />
              </span>
            }
            enabled={!isSaving}
            value={newSocial?.[key] ?? (social?.[key] || '')}
            onChange={onChangeValue(key)}
            {...props}
          />
        ))}
      </FormSection>
    </>
  );
};

export default UserExternalProfilesForm;
