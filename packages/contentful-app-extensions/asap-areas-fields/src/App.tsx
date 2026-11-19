import { FieldAppSDK, locations } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import React, { useMemo } from 'react';
import { getAsapAreaIds, getAsapAreaMemberIds } from './asapAreas';
import OrderedReferencesField from './locations/OrderedReferencesField';
import TeamAsapAreasField from './locations/TeamAsapAreasField';
import TeamAsapMembersField from './locations/TeamAsapMembersField';

const AsapAreaMembersField = () => (
  <OrderedReferencesField
    loadIds={getAsapAreaMemberIds}
    emptyMessage="No Team ASAP members have this area on their membership yet."
  />
);

const AboutAsapAreasField = () => (
  <OrderedReferencesField
    loadIds={getAsapAreaIds}
    emptyMessage="No ASAP Areas have been created yet."
  />
);

export const getFieldComponent = (contentTypeId: string, fieldId: string) => {
  if (contentTypeId === 'asapAreas' && fieldId === 'members') {
    return AsapAreaMembersField;
  }
  if (contentTypeId === 'discover' && fieldId === 'asapAreas') {
    return AboutAsapAreasField;
  }
  if (contentTypeId === 'discover' && fieldId === 'members') {
    return TeamAsapMembersField;
  }
  if (contentTypeId === 'teamMembership' && fieldId === 'asapAreas') {
    return TeamAsapAreasField;
  }
  return null;
};

const App = () => {
  const sdk = useSDK();

  const Component = useMemo(() => {
    if (sdk.location.is(locations.LOCATION_ENTRY_FIELD)) {
      const fieldSdk = sdk as FieldAppSDK;
      return getFieldComponent(fieldSdk.contentType.sys.id, fieldSdk.field.id);
    }
    return null;
  }, [sdk]);

  return Component ? <Component /> : null;
};

export default App;
