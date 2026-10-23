import { Download, Sparkles, Share2 } from 'lucide-react';
import { Button, Card, CopyButton, useToast } from '../ui';

interface ExportActionsProps {
  content: string;
  repoName?: string;
  isGenerating?: boolean;
}

export const ExportActions = ({
  content,
  repoName,
  isGenerating = false,
}: ExportActionsProps) => {
  const { showToast } = useToast();

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName || 'README'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: repoName ? `${repoName} README` : 'README Export',
          text: content,
        });
      } else {
        await navigator.clipboard.writeText(content);
        showToast('Share not supported in this browser. Copied to clipboard instead!', 'success');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        showToast('Failed to share content', 'error');
      }
    }
  };

  return (
    <Card variant="hard-sm" rounded="2xl" className="p-0 overflow-hidden border-2 border-wharf-border-primary">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-wharf-primary/5 to-transparent" />
        <div className="relative px-4 py-2 border-b-2 border-wharf-border-primary bg-wharf-surface-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-wharf-success" />
              <div className="w-2.5 h-2.5 rounded-full bg-wharf-warning" />
              <div className="w-2.5 h-2.5 rounded-full bg-wharf-error" />
            </div>
            <span className="font-mono text-xs font-bold text-wharf-text-secondary ml-2">
              EXPORT ACTIONS
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-wharf-text-tertiary bg-wharf-surface-primary px-2 py-0.5 border border-wharf-border-secondary">
                <Sparkles className="w-3 h-3 animate-pulse text-wharf-primary" />
                Generating...
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-[10px] text-wharf-text-tertiary capitalize">
              {content.split('\n').length} lines
            </span>
            <span className="font-mono text-[10px] text-wharf-text-secondary opacity-50">|</span>
            <span className="font-mono text-[10px] text-wharf-text-tertiary capitalize">
              {content.length} chars
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="p-4 bg-wharf-surface-primary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2 mb-6">
          {/* Copy Button */}
          <CopyButton
            content={content}
            variant="button"
            idleVariant="primary"
            label="Copy"
            className="w-full justify-center"
          />

          {/* Download Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={handleDownload}
            className="relative group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 w-full justify-center">
              <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              <span className="font-mono text-xs font-bold">Download</span>
            </div>
          </Button>

          {/* Share Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={handleShare}
            className="relative group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] col-span-2 sm:col-span-1 justify-self-center sm:justify-self-stretch w-[calc(50%-0.5rem)] sm:w-full"
          >
            <div className="flex items-center gap-2 w-full justify-center">
              <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="font-mono text-xs font-bold">Share</span>
            </div>
          </Button>

          {/* Save Button */}
          {/* <Button
            size="sm"
            variant={isSaved ? 'success' : 'secondary'}
            onClick={handleSave}
            className={`relative group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              isSaved ? 'border-2 border-wharf-green/50' : ''
            }`}
            disabled={isSaved}
          >
            <div className="flex items-center gap-2 w-full justify-center">
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="font-mono text-xs font-bold">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-xs font-bold">Save</span>
                </>
              )}
            </div>
          </Button> */}

          {/* Create Gist Button */}
          {/* <Button
            size="sm"
            variant="secondary"
            onClick={handleGist}
            className="relative group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-[#24292f] hover:text-white hover:border-[#24292f]"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex items-center gap-2 w-full justify-center">
              {isHovering ? (
                <ExternalLink className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              ) : (
                <FaGithub className="w-4 h-4" />
              )}
              <span className="font-mono text-xs font-bold">Create Gist</span>
            </div>
          </Button> */}
        </div>

        {/* Stats */}
        {repoName && (
          <div className="mt-3 pt-3 border-t-2 border-wharf-border-secondary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-wharf-text-tertiary">
                  Repository:{' '}
                  <span className="text-wharf-text-secondary font-bold">{repoName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-wharf-text-tertiary">README.md</span>
                <span className="font-mono text-[10px] text-wharf-text-tertiary opacity-50">|</span>
                <span className="font-mono text-[10px] text-wharf-text-tertiary">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
