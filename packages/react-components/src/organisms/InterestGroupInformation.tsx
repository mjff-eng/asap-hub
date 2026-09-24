import { InterestGroupResponse } from '@asap-hub/model';
import { Card, Divider, Headline3, Paragraph } from '../atoms';
import TagList from '../molecules/TagList';
import { rem } from '../pixels';

type InterestGroupInformationProps = Pick<
  InterestGroupResponse,
  'description' | 'tags'
>;
const InterestGroupInformation: React.FC<InterestGroupInformationProps> = ({
  description,
  tags,
}) => (
  <Card>
    <Headline3>Interest Group Description</Headline3>
    <Paragraph accent="tertiary">
      <span css={{ whiteSpace: 'pre-line' }}>{description}</span>
    </Paragraph>
    <Divider />
    <Headline3>Tags</Headline3>
    <div
      css={{
        marginTop: rem(12),
        marginBottom: rem(24),
      }}
    >
      <Paragraph noMargin accent="tertiary">
        Explore keywords related to skills, techniques, resources, and tools.
      </Paragraph>
    </div>
    <TagList tags={tags.map(({ name }) => name)} />
  </Card>
);

export default InterestGroupInformation;
