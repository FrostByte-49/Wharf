import { Link2, ArrowRight, Zap, CheckCircle, AlertCircle, GitBranch, Star } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { Input, Button, Card } from '../ui';
import { useState } from 'react';
import { getPopularExample } from '../../data/popularExamplesData';

interface ChangelogInputProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  apiError?: string | null;
  onSelectExample?: (exampleName: string) => void;
}

export const ChangelogInput = ({
  repoUrl,
  setRepoUrl,
  onAnalyze,
  isLoading,
  apiError,
  onSelectExample,
}: ChangelogInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      return { isValid: false, message: 'Please Enter A Repository URL' };
    }

    if (!url.includes('github.com')) {
      return { isValid: false, message: 'Please Enter A Valid GitHub Repository URL' };
    }

    // Check If URL Has The Correct Format: github.com/owner/repo
    const githubPattern = /github\.com\/[^/]+\/[^/]+/;
    if (!githubPattern.test(url)) {
      return {
        isValid: false,
        message: 'Invalid GitHub Repository Format. Use: https://github.com/owner/repo',
      };
    }

    return { isValid: true, message: 'Valid GitHub Repository URL' };
  };

  const isValidUrl = () => {
    const result = validateUrl(repoUrl);
    return result.isValid;
  };

  const getValidationStatus = () => {
    if (!touched || !repoUrl) return null;
    return validateUrl(repoUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const handleAnalyze = () => {
    const validation = validateUrl(repoUrl);

    if (!validation.isValid) {
      setTouched(true);
      return;
    }

    onAnalyze();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('github.com')) {
      const match = pastedText.match(/github\.com\/([^/]+\/[^/\s]+)/);
      if (match) {
        const cleanUrl = `https://github.com/${match[1]}`;
        setRepoUrl(cleanUrl);
        setTouched(true);
        e.preventDefault();
      }
    }
  };

  const handleExampleClick = (example: string) => {
    const popular = getPopularExample(example);
    if (popular) {
      setRepoUrl(popular.repoData.url);
      setTouched(true);
      if (onSelectExample) {
        onSelectExample(example);
        return;
      }
    }
    const url = `https://github.com/${example}`;
    setRepoUrl(url);
    setTouched(true);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRepoUrl(value);
    setTouched(true);
  };

  const validation = getValidationStatus();
  const isValid = isValidUrl();
  const isButtonDisabled = isLoading || (touched && !isValid);

  const examples = [
    { name: 'facebook/react', stars: '222k', description: 'React UI library' },
    { name: 'vercel/next.js', stars: '120k', description: 'React framework' },
    { name: 'tailwindlabs/tailwindcss', stars: '78k', description: 'CSS framework' },
    { name: 'vuejs/vue', stars: '206k', description: 'Vue.js framework' },
  ];

  return (
    <Card variant="hard" rounded="3xl" className="overflow-visible !border-0 !shadow-none !bg-transparent !p-0 my-6 md:!border-2 md:!shadow-[var(--shadow-brutal)] md:!bg-wharf-surface-primary md:!p-6 md:!mb-6">
      <div className="py-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b-2 border-wharf-border-primary pb-3 mb-4">
          <div className="p-1.5 rounded-lg bg-wharf-cyan/10">
            <FaGithub className="w-4 h-4 text-wharf-cyan-darker" />
          </div>
          <span className="font-mono font-bold text-sm uppercase tracking-wider">
            Generate Changelog
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Input Section */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Link2
                  className={`w-4 h-4 transition-colors ${
                    isFocused ? 'text-wharf-cyan' : 'text-wharf-text-tertiary'
                  }`}
                />
              </div>
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={handleUrlChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsFocused(true);
                  setTouched(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                }}
                onPaste={handlePaste}
                className={`pl-9 font-mono text-sm transition-all duration-300 rounded-2xl ${
                  isFocused ? 'border-wharf-cyan ring-2 ring-wharf-cyan/20' : ''
                } ${touched && repoUrl ? (isValid ? 'border-wharf-green/50' : 'border-wharf-error/50') : ''}`}
              />

              {/* Validation Indicator */}
              {touched && repoUrl && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValid ? (
                    <CheckCircle className="w-4 h-4 text-wharf-green-darker" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-wharf-error" />
                  )}
                </div>
              )}
            </div>

            <Button
              variant="cyan"
              rounded="2xl"
              onClick={handleAnalyze}
              loading={isLoading}
              disabled={isButtonDisabled}
              className="min-w-[160px] group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Fetch Commits
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              {!isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-wharf-cyan to-wharf-cyan-dark opacity-0 group-hover:opacity-10 transition-opacity" />
              )}
            </Button>
          </div>

          {/* Validation Message */}
          {apiError && (
            <div className="flex items-center gap-2 p-2 bg-wharf-error/5 border border-wharf-error/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-wharf-error flex-shrink-0" />
              <span className="font-mono text-xs text-wharf-error capitalize">{apiError}</span>
            </div>
          )}

          {touched && repoUrl && !isValid && validation && !apiError && (
            <div className="flex items-center gap-2 p-2 bg-wharf-error/5 border border-wharf-error/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-wharf-error flex-shrink-0" />
              <span className="font-mono text-xs text-wharf-error capitalize">
                {validation.message}
              </span>
            </div>
          )}

          {/* Examples Section */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-wharf-cyan-darker" />
                <span className="font-mono text-xs text-wharf-text-secondary font-bold uppercase tracking-wider">
                  Popular Examples
                </span>
              </div>
              <div className="flex-1 h-px bg-wharf-border-secondary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {examples.map((example) => (
                <button
                  key={example.name}
                  onClick={() => handleExampleClick(example.name)}
                  className="group relative p-3 border-2 border-wharf-border-secondary hover:border-wharf-cyan hover:bg-wharf-cyan/5 transition-all rounded-xl text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold truncate">{example.name}</p>
                      <p className="font-mono text-[10px] text-wharf-text-tertiary mt-0.5 capitalize">
                        {example.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Star className="w-3 h-3 text-wharf-yellow-dark fill-wharf-yellow" />
                      <span className="font-mono text-[10px] text-wharf-text-tertiary">
                        {example.stars}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-wharf-cyan/20 rounded-xl transition-colors pointer-events-none" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

