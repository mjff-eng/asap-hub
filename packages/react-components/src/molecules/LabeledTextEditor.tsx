import { ComponentProps, forwardRef } from 'react';
import { css, SerializedStyles } from '@emotion/react';

import { rem } from '../pixels';
import { Label, Paragraph, TextEditor } from '../atoms';
import { colour } from '../colors';

const tipStyles = css({
  marginTop: 0,
  ':empty': {
    display: 'none',
  },
  paddingTop: 0,

  color: colour.foreground.tertiary,
});

const subtitleStyles = css({
  paddingLeft: rem(6),
});

type LabeledTextEditorProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly tip?: React.ReactNode;
  readonly info?: React.ReactNode;
  readonly editorStyles?: SerializedStyles;
  readonly hasError?: boolean;
  readonly autofocus?: boolean;
} & Exclude<ComponentProps<typeof TextEditor>, 'id'>;

const LabeledTextEditor: React.FC<LabeledTextEditorProps> = forwardRef<
  HTMLDivElement,
  LabeledTextEditorProps
>(({ title, subtitle, tip, info, ...textEditorProps }, ref) => (
  <div>
    <Label
      forContent={(id) => <TextEditor {...textEditorProps} id={id} ref={ref} />}
    >
      <Paragraph noMargin styles={css({ paddingBottom: rem(16) })}>
        <span css={{ display: 'flex', marginBottom: 0 }}>
          <strong>{title}</strong>
          <span css={subtitleStyles}>{subtitle}</span>
        </span>
        <span css={tipStyles}>{tip}</span>
      </Paragraph>
    </Label>
  </div>
));

export default LabeledTextEditor;
