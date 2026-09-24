import { css } from '@emotion/react';
import {
  metricsExportMap,
  MetricExportKeys,
  TimeRangeOption,
  timeRangeOptions,
  warningMessageByTimeRange,
} from '@asap-hub/model';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../atoms';
import { crossIcon, downloadIcon } from '../icons';
import {
  FormSection,
  LabeledCheckboxGroup,
  LabeledDropdown,
  Modal,
} from '../molecules';
import { mobileScreen, rem } from '../pixels';
import { Title, Option } from './CheckboxGroup';
import Toast from './Toast';
import { colors } from '..';

const contentStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
  display: 'flex',
  flexFlow: 'column',
  gap: 32,
});

const buttonMediaQuery = `@media (min-width: ${mobileScreen.max - 100}px)`;

const buttonContainerStyles = css({
  display: 'grid',
  columnGap: rem(30),
  gridTemplateRows: 'max-content 12px max-content',
  [buttonMediaQuery]: {
    gridTemplateColumns: 'max-content max-content',
    gridTemplateRows: 'auto',
    justifyContent: 'flex-end',
  },
});

const confirmButtonStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gridRow: '1 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
    gridColumn: '2',
  },
});

const dismissButtonStyles = css({
  display: 'flex',
  justifyContent: 'center',
  gridRow: '2 / span 2',
  gridColumn: '1',
  [buttonMediaQuery]: {
    gridRow: '1',
  },
});

const alwaysVisible = (currentTimeRange: TimeRangeOption) =>
  (
    [
      '30d',
      '90d',
      'current-year',
      'last-year',
      'all',
    ] satisfies readonly TimeRangeOption[]
  ).includes(currentTimeRange);

const whenLastYearOrSinceLaunch = (currentTimeRange: TimeRangeOption) =>
  currentTimeRange === 'last-year' || currentTimeRange === 'all';

const whenSinceLaunch = (currentTimeRange: TimeRangeOption) =>
  currentTimeRange === 'all';

const optionsToExport: ReadonlyArray<
  (Option<MetricExportKeys> | Title) & {
    isVisible: (currentTimeRange: TimeRangeOption) => boolean;
  }
> = [
  {
    title: 'RESOURCE & DATA SHARING',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['user-productivity'],
    value: 'user-productivity',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['team-productivity'],
    value: 'team-productivity',
    isVisible: alwaysVisible,
  },
  {
    title: 'COLLABORATION',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['user-collaboration-within'],
    value: 'user-collaboration-within',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['user-collaboration-across'],
    value: 'user-collaboration-across',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['team-collaboration-within'],
    value: 'team-collaboration-within',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['team-collaboration-across'],
    value: 'team-collaboration-across',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap['preliminary-data-sharing'],
    value: 'preliminary-data-sharing',
    isVisible: whenLastYearOrSinceLaunch,
  },
  {
    title: 'LEADERSHIP & MEMBERSHIP',
    info: 'Leadership & Membership metrics can only be exported with their current status.',
    isVisible: whenSinceLaunch,
  },
  {
    label: metricsExportMap['wg-leadership'],
    value: 'wg-leadership',
    isVisible: whenSinceLaunch,
  },
  {
    label: metricsExportMap['ig-leadership'],
    value: 'ig-leadership',
    isVisible: whenSinceLaunch,
  },
  {
    label: metricsExportMap['os-champion'],
    value: 'os-champion',
    isVisible: whenSinceLaunch,
  },
  {
    title: 'ENGAGEMENT',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap.engagement,
    value: 'engagement',
    isVisible: alwaysVisible,
  },
  {
    label: metricsExportMap.attendance,
    value: 'attendance',
    isVisible: whenLastYearOrSinceLaunch,
  },

  {
    title: 'OPEN SCIENCE',
    isVisible: whenLastYearOrSinceLaunch,
  },
  {
    label: metricsExportMap['preprint-compliance'],
    value: 'preprint-compliance',
    isVisible: whenLastYearOrSinceLaunch,
  },
  {
    label: metricsExportMap['publication-compliance'],
    value: 'publication-compliance',
    isVisible: whenLastYearOrSinceLaunch,
  },
];

export type ExportAnalyticsModalData = {
  timeRange: TimeRangeOption;
  metrics: Set<MetricExportKeys>;
};

type ExportAnalyticsModalProps = {
  onDismiss: () => void;
  onDownload: (
    timeRange: ExportAnalyticsModalData['timeRange'],
    metrics: ExportAnalyticsModalData['metrics'],
  ) => Promise<void>;
};
const ExportAnalyticsModal: React.FC<ExportAnalyticsModalProps> = ({
  onDismiss,
  onDownload,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const methods = useForm<ExportAnalyticsModalData>({
    mode: 'onBlur',
    defaultValues: {
      timeRange: undefined,
      metrics: new Set(),
    },
  });

  const dataRange = useMemo(
    () =>
      Object.entries(timeRangeOptions).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const {
    control,
    formState: { isSubmitting },
    watch,
    getValues,
    setValue,
  } = methods;

  const isExportEnabled = !!watch('timeRange') && watch('metrics').size > 0;

  const handleMetricsSelection = (newValue: MetricExportKeys) => {
    const metricsSet = getValues('metrics');
    if (metricsSet.has(newValue)) {
      metricsSet.delete(newValue);
    } else {
      metricsSet.add(newValue);
    }
    setValue('metrics', metricsSet);
  };

  const handleExport = async () => {
    const timeRange = getValues('timeRange');
    const metrics = getValues('metrics');
    setIsDownloading(true);
    await onDownload(timeRange, metrics);
    setIsDownloading(false);
    onDismiss();
  };

  const isProcessing = isSubmitting || isDownloading;

  return (
    <Modal padding={false} overrideModalStyles={css({ width: '100%' })}>
      <>
        <form css={contentStyles}>
          <FormSection
            title="Download Multiple XLSX"
            headerDecorator={
              <Button small noMargin onClick={onDismiss}>
                {crossIcon}
              </Button>
            }
          >
            <div css={css({ display: 'flex', flexFlow: 'column', gap: 16 })}>
              <Controller
                name="timeRange"
                control={control}
                rules={{
                  required: 'Please select an option.',
                }}
                render={({ field: { value, onChange } }) => (
                  <LabeledDropdown
                    name="Time Range"
                    title="Select data range"
                    subtitle="(required)"
                    description="Select the type that matches your output the best to unlock metrics."
                    options={dataRange}
                    required
                    enabled={!isProcessing}
                    placeholder="Choose a data range"
                    value={value ?? ''}
                    onChange={onChange}
                  />
                )}
              />
              {warningMessageByTimeRange[getValues('timeRange')] && (
                <Toast accent="warning" rounded>
                  {warningMessageByTimeRange[getValues('timeRange')]}
                </Toast>
              )}
            </div>
          </FormSection>
          <FormSection>
            <Controller
              name="metrics"
              control={control}
              rules={{
                required: 'Please select an option.',
              }}
              render={({ field: { value }, fieldState: { error } }) => (
                <LabeledCheckboxGroup
                  title="Select metrics to download"
                  subtitle="(required)"
                  description="You need to select at least one metric."
                  onChange={(newValue) =>
                    handleMetricsSelection(newValue as MetricExportKeys)
                  }
                  values={value}
                  validationMessage={error?.message ?? ''}
                  options={optionsToExport
                    .filter((item) =>
                      getValues('timeRange')
                        ? item.isVisible(getValues('timeRange'))
                        : true,
                    )
                    .map((item) => {
                      if ('title' in item) {
                        return {
                          title: item.title,
                          info: item.info,
                        };
                      }

                      return {
                        value: item.value,
                        label: item.label,
                        enabled: !isProcessing && !!getValues('timeRange'),
                      };
                    })}
                />
              )}
            />
          </FormSection>
          <div css={buttonContainerStyles}>
            <div css={dismissButtonStyles}>
              <Button enabled onClick={onDismiss} noMargin>
                Cancel
              </Button>
            </div>
            <div css={confirmButtonStyles}>
              <Button
                noMargin
                primary
                enabled={isExportEnabled && !isProcessing}
                onClick={handleExport}
                overrideStyles={css({
                  height: 'fit-content',
                  svg:
                    isExportEnabled && !isProcessing
                      ? {}
                      : {
                          path: {
                            fill: colors.colour.foreground.tertiary,
                          },
                        },
                })}
              >
                {downloadIcon}{' '}
                {isDownloading ? 'Exporting...' : 'Download XLSX'}
              </Button>
            </div>
          </div>
        </form>
      </>
    </Modal>
  );
};

export default ExportAnalyticsModal;
