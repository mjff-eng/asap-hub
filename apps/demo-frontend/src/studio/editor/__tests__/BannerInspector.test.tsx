import { Banner } from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import BannerInspector from '../BannerInspector';

const banner: Banner = {
  id: 'banner-a',
  startMs: 2000,
  durationMs: 3000,
  preset: 'lowerThird',
  text: 'Attendance',
  position: 'bottom',
  animation: 'fade',
};

const renderInspector = (
  props: Partial<ComponentProps<typeof BannerInspector>> = {},
) => {
  const handlers = { onChange: jest.fn(), onRemove: jest.fn() };
  render(
    <BannerInspector
      banner={banner}
      readOnly={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('BannerInspector', () => {
  it('changes the heading', async () => {
    const { onChange } = renderInspector();

    await userEvent.type(screen.getByLabelText('Heading'), '!');

    expect(onChange).toHaveBeenCalledWith({ text: 'Attendance!' });
  });

  it('adds a subtitle to a banner that had none', async () => {
    const { onChange } = renderInspector();

    await userEvent.type(screen.getByLabelText('Subtitle'), 'Q');

    expect(onChange).toHaveBeenCalledWith({ subtitle: 'Q' });
  });

  it('moves the banner to the upper third', async () => {
    const { onChange } = renderInspector();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Position' }),
      'Upper third',
    );

    expect(onChange).toHaveBeenCalledWith({ position: 'top' });
  });

  it('slides the banner in instead of fading it', async () => {
    const { onChange } = renderInspector();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Animation' }),
      'Slide',
    );

    expect(onChange).toHaveBeenCalledWith({ animation: 'slide' });
  });

  it('changes how long the text takes to fade in and out', () => {
    const { onChange } = renderInspector();

    fireEvent.change(screen.getByLabelText(/^Text fades in over/), {
      target: { value: '600' },
    });
    fireEvent.change(screen.getByLabelText(/^Text fades out over/), {
      target: { value: '0' },
    });

    expect(onChange).toHaveBeenCalledWith({ fadeInMs: 600 });
    expect(onChange).toHaveBeenCalledWith({ fadeOutMs: 0 });
  });

  it('keeps its length when it is moved and the programme length is unknown', async () => {
    const { onChange } = renderInspector();

    const field = screen.getByRole('textbox', { name: /Starts at/ });
    await userEvent.clear(field);
    await userEvent.type(field, '1:00.00{Enter}');

    expect(onChange).toHaveBeenCalledWith({ startMs: 60000 });
  });

  it('gives up length rather than run past the end of the programme', async () => {
    const { onChange } = renderInspector({ programmeMs: 6000 });

    const field = screen.getByRole('textbox', { name: /Starts at/ });
    await userEvent.clear(field);
    await userEvent.type(field, '0:04.00{Enter}');

    expect(onChange).toHaveBeenCalledWith({ startMs: 4000, durationMs: 2000 });
  });
});
