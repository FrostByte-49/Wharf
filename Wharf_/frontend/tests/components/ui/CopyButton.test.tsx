import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CopyButton } from '../../../src/components/ui/CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders idle copy state with default label and copy icon', () => {
    render(<CopyButton content="test text" label="Copy" />);
    
    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('copies content to clipboard and transitions to checked state with accent green badge', async () => {
    render(<CopyButton content="hello world" label="Copy" />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(button.className).toContain('bg-wharf-green');
  });

  it('displays subtle confirmation tooltip and announces via aria-live', async () => {
    render(<CopyButton content="hello world" />);

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    // Tooltip confirmation
    expect(screen.getByTestId('copy-tooltip')).toHaveTextContent('Copied to clipboard!');

    // Screen reader accessible announcement
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('Copied to clipboard!');
  });

  it('reverts back to idle state after 2 seconds', async () => {
    render(<CopyButton content="hello world" label="Copy" />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    // Fast-forward 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('supports codeblock and toolbar variants', () => {
    const { rerender } = render(<CopyButton content="code snippet" variant="codeblock" />);
    let button = screen.getByRole('button');
    expect(button.className).toContain('opacity-90');

    rerender(<CopyButton content="markdown" variant="toolbar" label="Copy" />);
    button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('triggers onCopy callback when provided', async () => {
    const onCopySpy = vi.fn();
    render(<CopyButton content="data" onCopy={onCopySpy} />);

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onCopySpy).toHaveBeenCalledTimes(1);
  });
});
