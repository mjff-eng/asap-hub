import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { makeVideo } from '../../../test-utils';
import ProjectHeader from '../ProjectHeader';

const video = makeVideo({
  id: 'project-1',
  title: 'Sprint 16 demo',
  kind: 'studio',
  status: 'draft',
  processingState: 'empty',
});

const renderHeader = ({
  readOnly = false,
  leasePending = false,
  leaseHolder,
  dirty = false,
}: {
  readOnly?: boolean;
  leasePending?: boolean;
  leaseHolder?: string;
  dirty?: boolean;
} = {}) => {
  const onRename = jest.fn();
  render(
    <MemoryRouter>
      <ProjectHeader
        video={video}
        readOnly={readOnly}
        leasePending={leasePending}
        leaseHolder={leaseHolder}
        dirty={dirty}
        onLeave={() => true}
        onRetryLease={jest.fn()}
        onRename={onRename}
        onPublish={jest.fn()}
        onUnpublish={jest.fn()}
      />
    </MemoryRouter>,
  );
  return { onRename, title: screen.getByLabelText('Demo title') };
};

describe('renaming the demo in the header', () => {
  it('renames it when Enter is pressed', async () => {
    const { onRename, title } = renderHeader();

    await userEvent.clear(title);
    await userEvent.type(title, 'Sprint 17 demo{Enter}');

    expect(onRename).toHaveBeenCalledWith('Sprint 17 demo');
    expect(title).not.toHaveFocus();
  });

  it('lets Escape leave the field without renaming anything', async () => {
    const { onRename, title } = renderHeader();

    await userEvent.click(title);
    await userEvent.keyboard('{Escape}');

    expect(onRename).not.toHaveBeenCalled();
    expect(title).toHaveValue('Sprint 16 demo');
    expect(title).not.toHaveFocus();
  });

  it('puts the old name back when the field is left empty', () => {
    const { onRename, title } = renderHeader();

    fireEvent.change(title, { target: { value: '   ' } });
    fireEvent.blur(title);

    expect(onRename).not.toHaveBeenCalled();
    expect(title).toHaveValue('Sprint 16 demo');
  });
});

describe('when the editing lock is elsewhere', () => {
  it('says someone holds it when it does not know who', () => {
    renderHeader({ readOnly: true });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Someone else holds the editing lock, so this demo is read only for now.',
    );
  });

  it('warns that edits made before the lock went cannot be saved', () => {
    renderHeader({ readOnly: true, leaseHolder: 'Bo', dirty: true });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bo is editing this demo, so it is read only for now. The edits made before the lock went cannot be saved until it comes back.',
    );
  });

  it('says nothing about a holder while the lock is still being asked for', () => {
    renderHeader({ readOnly: true, leasePending: true });

    expect(screen.getByText('Opening the editor…')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
