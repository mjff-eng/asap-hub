import { getFieldComponent } from '../App';
import TeamAsapAreasField from '../locations/TeamAsapAreasField';

jest.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: jest.fn(),
}));

jest.mock('@contentful/field-editor-reference', () => ({
  MultipleEntryReferenceEditor: () => null,
}));

describe('getFieldComponent', () => {
  it('uses the Team ASAP editor for the team membership ASAP Areas field', () => {
    expect(getFieldComponent('teamMembership', 'asapAreas')).toBe(
      TeamAsapAreasField,
    );
  });

  it('uses an ordered list editor for area members and About ASAP areas', () => {
    expect(getFieldComponent('asapAreas', 'members')).not.toBeNull();
    expect(getFieldComponent('discover', 'asapAreas')).not.toBeNull();
  });

  it('renders nothing for any other field', () => {
    expect(getFieldComponent('users', 'teams')).toBeNull();
  });
});
