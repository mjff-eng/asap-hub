import { useContext } from 'react';
import { UserProfileContext } from '@asap-hub/react-context';
import { ResearchTagDataObject } from '@asap-hub/model';

import { Card, Divider, Headline2, Paragraph } from '../atoms';
import { TagList } from '../molecules';
import UserProfilePlaceholderCard from './UserProfilePlaceholderCard';
import { rem } from '../pixels';

type ProfileExpertiseAndResourcesProps = {
  readonly tags?: Pick<ResearchTagDataObject, 'id' | 'name'>[] | undefined;
  readonly expertiseAndResourceDescription?: string;
  readonly hideExpertiseAndResources?: boolean;
};

const ProfileExpertiseAndResources: React.FC<
  ProfileExpertiseAndResourcesProps
> = ({
  tags = [],
  expertiseAndResourceDescription,
  hideExpertiseAndResources,
}) => {
  const { isOwnProfile } = useContext(UserProfileContext);
  return tags.length || isOwnProfile ? (
    <Card>
      {!hideExpertiseAndResources && (
        <>
          <Headline2 styleAsHeading={3} noMargin>
            Expertise and Resources
          </Headline2>
          {!expertiseAndResourceDescription && isOwnProfile ? (
            <UserProfilePlaceholderCard title="How would you summarize your expertise and resources?">
              Add one or two sentences to help others understand your strengths
            </UserProfilePlaceholderCard>
          ) : (
            <Paragraph>{expertiseAndResourceDescription}</Paragraph>
          )}
          <div css={{ marginTop: rem(24) }}>
            <Divider />
          </div>
        </>
      )}
      <Headline2 styleAsHeading={3}>Tags</Headline2>
      {tags.length ? (
        <>
          <div
            css={{
              marginTop: rem(24),
              marginBottom: rem(24),
            }}
          >
            <Paragraph noMargin accent="neutral900">
              Explore keywords related to skills, techniques, resources, and
              tools.
            </Paragraph>
          </div>

          <TagList tags={tags.map(({ name }) => name)} />
        </>
      ) : (
        <div css={{ marginTop: rem(4) }}>
          <UserProfilePlaceholderCard title="Add tags to your profile">
            Help other researchers find you by adding keywords about your
            skills, techniques, resources, and tools. Completing this section
            will make you more likely to come up in search results.
            <div css={{ marginTop: rem(16) }}>
              <TagList
                tags={[
                  'Structural biology',
                  'Autophagy',
                  'Transcriptional regulation',
                  'Electron Microscopy',
                  'Multi-omics',
                  'Long-read sequencing',
                  'LRRK2',
                  'Alpha-synuclein',
                  'VPS35',
                ]}
                enabled={false}
              />
            </div>
          </UserProfilePlaceholderCard>
        </div>
      )}
    </Card>
  ) : null;
};

export default ProfileExpertiseAndResources;
