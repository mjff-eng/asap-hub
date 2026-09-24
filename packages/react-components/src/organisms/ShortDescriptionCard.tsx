import { css } from '@emotion/react';
import { ComponentProps, useState } from 'react';
import { Button } from '../atoms';
import { aiGenerate } from '../icons';
import { LabeledTextArea } from '../molecules';
import { rem } from '../pixels';
import { colour } from '../colors';

type ShortDescriptionCardProps = Omit<
  ComponentProps<typeof LabeledTextArea>,
  'title' | 'subtitle'
> & {
  getShortDescription: () => Promise<string>;
  buttonEnabled?: boolean;
};

const iconStyles = (isGenerateButtonEnabled: boolean) =>
  css({
    display: 'flex',
    marginRight: rem(8),
    path: {
      fill: isGenerateButtonEnabled ? '#FFFFFF' : colour.neutral[600],
    },
  });

const ShortDescriptionCard: React.FC<ShortDescriptionCardProps> = ({
  enabled,
  buttonEnabled = true,
  onChange,
  getShortDescription,
  getValidationMessage,
  customValidationMessage,
  ...props
}) => {
  const [generatingStatus, setGeneratingStatus] = useState<
    'initial' | 'isGenerating' | 'isRegenerating' | 'hasGenerated'
  >('initial');

  const [generationError, setGenerationError] = useState('');

  const handleGenerate = async () => {
    const previousStatus = generatingStatus;
    setGeneratingStatus(
      previousStatus === 'initial' ? 'isGenerating' : 'isRegenerating',
    );
    setGenerationError('');
    try {
      const shortDescription = await getShortDescription();
      if (onChange) {
        onChange(shortDescription);
      }
      setGeneratingStatus('hasGenerated');
    } catch {
      setGenerationError(
        'There was a problem generating the short description. Please try again or write your own.',
      );
      setGeneratingStatus(previousStatus);
    }
  };

  const handleChange = (value: string) => {
    if (generationError) {
      setGenerationError('');
    }
    if (onChange) {
      onChange(value);
    }
  };

  const isGenerateButtonEnabled = Boolean(
    buttonEnabled &&
      enabled &&
      generatingStatus !== 'isGenerating' &&
      generatingStatus !== 'isRegenerating',
  );

  return (
    <LabeledTextArea
      title="Short Description"
      subtitle="(required)"
      tip="Add a short description based on what you wrote on the
    description field above."
      customValidationMessage={generationError || customValidationMessage}
      getValidationMessage={getValidationMessage}
      onChange={handleChange}
      required
      {...props}
      enabled={
        enabled &&
        generatingStatus !== 'isGenerating' &&
        generatingStatus !== 'isRegenerating'
      }
      extras={
        <Button
          primary
          noMargin
          small
          enabled={isGenerateButtonEnabled}
          onClick={handleGenerate}
        >
          <span css={iconStyles(isGenerateButtonEnabled)}>{aiGenerate}</span>
          {generatingStatus === 'initial' || generatingStatus === 'isGenerating'
            ? 'Generate'
            : 'Regenerate'}
        </Button>
      }
    />
  );
};
export default ShortDescriptionCard;
