import { gp2 as gp2Model } from '@asap-hub/model';
import { EventRelatedResearchCard } from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';

import { getSourceIcon } from '../utils';

const getEntityHref = ({ type, id }: gp2Model.OutputOwner) =>
  type === 'WorkingGroups'
    ? gp2Routing.workingGroups({}).workingGroup({ workingGroupId: id }).$
    : gp2Routing.projects({}).project({ projectId: id }).$;

type EventRelatedOutputsCardProps = {
  readonly relatedOutputs: gp2Model.RelatedOutputs[];
};

const EventRelatedOutputsCard: React.FC<EventRelatedOutputsCardProps> = ({
  relatedOutputs,
}) => (
  <EventRelatedResearchCard
    relatedResearch={relatedOutputs.map(
      ({ id, title, documentType, type, entity }) => ({
        id,
        title,
        href: gp2Routing.outputs({}).output({ outputId: id }).$,
        documentType,
        type,
        source: entity?.id
          ? {
              title: entity.title,
              href: getEntityHref(entity),
              icon: getSourceIcon(entity.type),
            }
          : undefined,
      }),
    )}
  />
);

export default EventRelatedOutputsCard;
