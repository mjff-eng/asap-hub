import { limits, Point } from '@asap-hub/demo-timeline';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState } from 'react';
import { PointField, TextField, TimecodeField } from '../fields';

const Editable: FC<{ readonly label: string }> = ({ label }) => {
  const [value, setValue] = useState('');
  return <TextField label={label} value={value} onChange={setValue} />;
};

const Aimable: FC<{ readonly onChange: (point: Point) => void }> = ({
  onChange,
}) => {
  const [point, setPoint] = useState<Point>({ x: 0.5, y: 0.5 });
  return (
    <PointField
      label="Focus"
      value={point}
      onChange={(next) => {
        setPoint(next);
        onChange(next);
      }}
    />
  );
};

describe('TextField', () => {
  // the server rejects the whole document over one long string, and the only
  // sign of it was "Could not save, retrying on the next edit", forever
  it('cannot take more text than the document allows', async () => {
    render(<Editable label="Heading" />);

    const field = screen.getByLabelText('Heading');
    await userEvent.click(field);
    await userEvent.paste('a'.repeat(limits.textLength + 100));

    expect(field).toHaveValue('a'.repeat(limits.textLength));
  });

  it('is not offered an unrelated saved value by the browser', () => {
    render(<TextField label="Subtitle" value="" onChange={jest.fn()} />);

    expect(screen.getByLabelText('Subtitle')).toHaveAttribute(
      'autocomplete',
      'off',
    );
  });
});

describe('PointField', () => {
  // aiming a zoom or a click was a drag across the picture and nothing else
  it('gives the focus point a keyboard path', async () => {
    const onChange = jest.fn();
    render(<Aimable onChange={onChange} />);

    const across = screen.getByLabelText('% across');
    await userEvent.clear(across);
    await userEvent.type(across, '25');

    expect(onChange).toHaveBeenLastCalledWith({ x: 0.25, y: 0.5 });
  });

  it('keeps a point inside the frame', async () => {
    const onChange = jest.fn();
    render(<Aimable onChange={onChange} />);

    const down = screen.getByLabelText('% down');
    await userEvent.clear(down);
    await userEvent.type(down, '400');

    expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 1 });
  });
});

describe('TimecodeField', () => {
  // an unreadable time was swallowed on Enter and the old value sprang back
  // with nothing said about it
  it('says so when what was typed is not a time', async () => {
    const onChange = jest.fn();
    render(
      <TimecodeField label="Starts at" value={2000} onChange={onChange} />,
    );

    const field = screen.getByLabelText(/Starts at/);
    await userEvent.clear(field);
    await userEvent.type(field, 'abc{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('m:ss.cc');
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue('0:02.00');
  });

  it('says so when a time is past the end it is allowed', async () => {
    const onChange = jest.fn();
    render(
      <TimecodeField
        label="Trim end"
        value={4000}
        maxMs={6000}
        onChange={onChange}
      />,
    );

    const field = screen.getByLabelText(/Trim end/);
    await userEvent.clear(field);
    await userEvent.type(field, '0:09.00{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:06.00.',
    );
    expect(onChange).toHaveBeenCalledWith(6000);
  });

  it('says so when a time is before the earliest it is allowed', async () => {
    render(
      <TimecodeField
        label="Trim end"
        value={4000}
        minMs={2000}
        onChange={jest.fn()}
      />,
    );

    const field = screen.getByLabelText(/Trim end/);
    await userEvent.clear(field);
    await userEvent.type(field, '0:01.00{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The earliest this can be is 0:02.00.',
    );
  });

  it('clears what it said as soon as the field is picked up again', async () => {
    render(
      <TimecodeField label="Starts at" value={2000} onChange={jest.fn()} />,
    );

    const field = screen.getByLabelText(/Starts at/);
    await userEvent.clear(field);
    await userEvent.type(field, 'abc{Enter}');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.click(field);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
