import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export type CopyButtonVariant = 'button' | 'toolbar' | 'codeblock' | 'icon';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'content'> {
  /** The content text to copy to the clipboard */
  content?: string | (() => string | Promise<string>);
  /** Optional custom copy callback */
  onCopy?: () => void | Promise<void>;
  /** Visual presentation variant */
  variant?: CopyButtonVariant;
  /** Idle color variant for 'button' variant (e.g. primary/pink, cyan, yellow) */
  idleVariant?: 'primary' | 'cyan' | 'yellow' | 'secondary' | 'ghost';
  /** Text label displayed in button variant when idle (defaults to "Copy") */
  label?: string;
  /** Text label displayed when copied (defaults to "Copied!") */
  copiedLabel?: string;
  /** Text shown inside the subtle confirmation tooltip */
  tooltipText?: string;
  /** Tooltip position relative to the button */
  tooltipPosition?: TooltipPosition;
  /** Additional class names */
  className?: string;
  /** Whether to show the text label alongside the icon */
  showLabel?: boolean;
}

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      content,
      onCopy,
      variant = 'button',
      idleVariant = 'primary',
      label = 'Copy',
      copiedLabel = 'Copied!',
      tooltipText = 'Copied to clipboard!',
      tooltipPosition = 'top',
      className,
      showLabel = true,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (disabled || copied) return;

      try {
        let textToCopy = '';
        if (typeof content === 'function') {
          textToCopy = await content();
        } else if (typeof content === 'string') {
          textToCopy = content;
        }

        if (textToCopy) {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            // Fallback for older or restricted environments
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
        }

        if (onCopy) {
          await onCopy();
        }

        setCopied(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    };

    // Tooltip offset coordinates based on position
    const tooltipPositionStyles: Record<TooltipPosition, string> = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowPositionStyles: Record<TooltipPosition, string> = {
      top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
      bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
      left: 'right-[-4px] top-1/2 -translate-y-1/2',
      right: 'left-[-4px] top-1/2 -translate-y-1/2',
    };

    // Variant-specific styles
    const getBaseStyles = () => {
      if (variant === 'button') {
        const idleBg =
          idleVariant === 'cyan'
            ? 'btn-cyan'
            : idleVariant === 'yellow'
            ? 'btn-yellow'
            : idleVariant === 'secondary'
            ? 'btn-secondary'
            : idleVariant === 'ghost'
            ? 'btn-ghost'
            : 'btn-primary';

        return cn(
          'btn btn-sm relative group transition-all duration-200 select-none cursor-pointer',
          copied
            ? 'bg-wharf-green text-black border-2 border-wharf-border-primary shadow-brutal-sm hover:bg-wharf-green-dark'
            : idleBg,
          className
        );
      }

      if (variant === 'toolbar') {
        return cn(
          'p-1.5 border-2 border-wharf-border-primary flex items-center gap-1.5 select-none cursor-pointer transition-all duration-200',
          copied
            ? 'bg-wharf-green text-black shadow-brutal-sm'
            : 'bg-wharf-surface-primary hover:bg-wharf-surface-secondary text-wharf-text-primary',
          className
        );
      }

      if (variant === 'codeblock') {
        return cn(
          'p-1.5 rounded border border-wharf-border-primary select-none cursor-pointer transition-all duration-200',
          'opacity-90 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100',
          copied
            ? 'bg-wharf-green text-black shadow-sm !opacity-100 scale-105'
            : 'bg-wharf-surface-primary hover:bg-wharf-surface-secondary text-wharf-text-secondary',
          className
        );
      }

      // icon variant
      return cn(
        'p-1.5 rounded-md border border-wharf-border-primary select-none cursor-pointer transition-all duration-200',
        copied
          ? 'bg-wharf-green text-black shadow-sm'
          : 'bg-transparent hover:bg-wharf-surface-secondary text-wharf-text-secondary',
        className
      );
    };

    return (
      <div className="relative inline-flex items-center justify-center">
        <button
          ref={ref}
          type="button"
          onClick={handleCopy}
          disabled={disabled}
          aria-label={copied ? 'Copied to clipboard!' : label ? `${label} to clipboard` : 'Copy to clipboard'}
          className={getBaseStyles()}
          {...props}
        >
          <div className="flex items-center gap-2 justify-center w-full">
            <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
              <Copy
                className={cn(
                  'w-4 h-4 transition-all duration-300 absolute',
                  copied
                    ? 'scale-0 rotate-90 opacity-0 pointer-events-none'
                    : 'scale-100 rotate-0 opacity-100 group-hover:rotate-[-6deg]'
                )}
              />
              <span
                className={cn(
                  'inline-flex items-center justify-center p-0.5 rounded-full bg-black/10 transition-all duration-300 absolute',
                  copied
                    ? 'scale-100 rotate-0 opacity-100'
                    : 'scale-0 -rotate-90 opacity-0 pointer-events-none'
                )}
              >
                <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
              </span>
            </span>
            {showLabel && variant !== 'codeblock' && variant !== 'icon' && (
              <span className="font-mono text-xs font-bold tracking-tight transition-all duration-200">
                {copied ? copiedLabel : label}
              </span>
            )}
          </div>
        </button>

        {/* Screen Reader Live Region for Accessibility */}
        <span className="sr-only" aria-live="polite">
          {copied ? 'Copied to clipboard!' : ''}
        </span>

        {/* Subtle Tooltip Confirmation ("Copied to clipboard!") */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: tooltipPosition === 'top' ? 4 : -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: tooltipPosition === 'top' ? 2 : -2, scale: 0.95 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className={cn(
                'absolute z-50 pointer-events-none px-2.5 py-1',
                'bg-black text-white font-mono text-[11px] font-bold whitespace-nowrap',
                'border-2 border-wharf-border-primary shadow-brutal-sm rounded-md',
                tooltipPositionStyles[tooltipPosition]
              )}
              role="status"
              data-testid="copy-tooltip"
              aria-hidden="true"
            >
              <div className="relative flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-wharf-green inline-block animate-pulse shrink-0" />
                <span>{tooltipText}</span>
                {/* Arrow */}
                <div
                  className={cn(
                    'absolute w-2 h-2 bg-black border-wharf-border-primary rotate-45',
                    arrowPositionStyles[tooltipPosition]
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CopyButton.displayName = 'CopyButton';
