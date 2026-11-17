import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useRef } from 'react';

import { ButtonLink, Modal, Spinner, useFocusTrap } from '../components';

describe('ButtonLink', () => {
  it('is a link dressed as a button', () => {
    render(
      <ButtonLink href="/media/stream.mp4" download="demo.mp4">
        Download
      </ButtonLink>,
    );

    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', '/media/stream.mp4');
    expect(link).toHaveAttribute('download', 'demo.mp4');
  });
});

describe('Spinner', () => {
  it('announces a generic loading state without a label', () => {
    render(<Spinner />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('Modal', () => {
  const renderModal = (children = <p>Nothing to press</p>) => {
    const onClose = jest.fn();
    render(
      <>
        <button type="button">behind</button>
        <Modal label="Delete demo" onClose={onClose}>
          {children}
        </Modal>
      </>,
    );
    return { onClose, dialog: screen.getByRole('dialog') };
  };

  const actions = (
    <>
      <button type="button">Cancel</button>
      <button type="button">Keep</button>
      <button type="button">Delete</button>
    </>
  );

  it('focuses its first control when it opens', () => {
    renderModal(actions);

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('keeps focus on the dialog when it holds nothing to tab to', async () => {
    const { dialog } = renderModal();
    expect(dialog).toHaveFocus();

    await userEvent.tab();
    expect(dialog).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(dialog).toHaveFocus();
  });

  it('wraps Tab from the last control back to the first', async () => {
    renderModal(actions);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first control to the last', async () => {
    renderModal(actions);

    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('pulls focus that escaped the dialog back inside', async () => {
    renderModal(actions);

    screen.getByRole('button', { name: 'behind' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    screen.getByRole('button', { name: 'behind' }).focus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('closes on Escape and on a press on the backdrop, not inside', async () => {
    const { onClose, dialog } = renderModal(actions);

    await userEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('hands focus back to whatever opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <Modal label="Delete demo" onClose={jest.fn()}>
        <button type="button">Cancel</button>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});

describe('useFocusTrap', () => {
  const Unattached: FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    useFocusTrap(ref, jest.fn());
    return (
      <>
        <button type="button">first</button>
        <button type="button">second</button>
      </>
    );
  };

  it('leaves Tab to the browser until it has an element to trap', async () => {
    render(<Unattached />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'second' })).toHaveFocus();
  });
});
