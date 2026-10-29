import { useState } from 'react';
import { Link2, ArrowRight, Zap, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { Badge, Button, Card, Input } from '../ui';
import { RepoSelector } from './RepoSelector';
import api from '../../lib/api';
import { getPopularExample } from '../../data/popularExamplesData';

export interface RepoData {
  url: string;
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  framework: string[];
}

interface RepoImportSectionProps {
  user: { id: string; name?: string; email?: string; username?: string } | null;
  onRepoSelect: (repo: RepoData, sampleReadme?: string) => void;
}

export const RepoImportSection = ({ user, onRepoSelect }: RepoImportSectionProps) => {
  const [importMethod, setImportMethod] = useState<'url' | 'github'>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [recentRepos] = useState<
    {
      id: number;
      name: string;
      full_name: string;
      stars: number;
      forks: number;
      language: string;
      url?: string;
      owner?: string;
      private?: boolean;
      updated_at?: string;
    }[]
  >([]);

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

  const handleUrlSubmit = async () => {
    const validation = validateUrl(repoUrl);

    if (!validation.isValid) {
      setTouched(true);
      return;
    }

    setApiError(null);
    setIsLoading(true);
    try {
      const response = await api.post('/repo/analyze', { repoUrl });
      if (response.data && response.data.success) {
        const analysis = response.data.data;
        onRepoSelect({
          url: repoUrl,
          owner: analysis.meta.owner,
          repo: analysis.meta.name,
          description: analysis.meta.description || '',
          stars: analysis.meta.stars || 0,
          forks: analysis.meta.forks || 0,
          language: analysis.meta.language || '',
          framework: analysis.frameworks || [],
        });
      } else {
        setApiError(response.data?.error || 'Failed To Analyze Repository');
      }
    } catch (err) {
      console.error('Failed To Analyze Repository:', err);
      let errorMsg = 'Failed To Analyze Repository. Please Check If It Exists.';

      // Type guard to check if err has response property
      if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = err as { response?: { data?: { error?: string } } };
        if (errorResponse.response?.data?.error) {
          errorMsg = errorResponse.response.data.error;
        }
      }

      if (errorMsg.includes('Not Found') || errorMsg.includes('docs.github.com')) {
        errorMsg = 'Repository Not Found. Please Check If It Exists.';
      }
      setApiError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('github.com')) {
      const match = pastedText.match(/github\.com\/([^/]+\/[^/\s]+)/);
      if (match) {
        const cleanUrl = `https://github.com/${match[1]}`;
        setRepoUrl(cleanUrl);
        setApiError(null);
        setTouched(true);
        e.preventDefault();
      }
    }
  };

  const handleExampleClick = (example: string) => {
    const popular = getPopularExample(example);
    if (popular) {
      setRepoUrl(popular.repoData.url);
      setApiError(null);
      setTouched(true);
      onRepoSelect(popular.repoData, popular.sampleReadme);
      return;
    }
    const url = `https://github.com/${example}`;
    setRepoUrl(url);
    setApiError(null);
    setTouched(true);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRepoUrl(value);
    setApiError(null);
    setTouched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
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

  const handleRepoSelect = async (repo: {
    id: number;
    name: string;
    full_name: string;
    stars: number;
    forks: number;
    language: string;
    url?: string;
    owner?: string;
    private?: boolean;
    updated_at?: string;
  }) => {
    setIsLoading(true);
    const targetUrl = repo.url || `https://github.com/${repo.full_name}`;
    try {
      const response = await api.post('/repo/analyze', { repoUrl: targetUrl });
      if (response.data && response.data.success) {
        const analysis = response.data.data;
        onRepoSelect({
          url: targetUrl,
          owner: analysis.meta.owner,
          repo: analysis.meta.name,
          description: analysis.meta.description || '',
          stars: analysis.meta.stars || 0,
          forks: repo.forks || 0,
          language: analysis.meta.language || '',
          framework: analysis.frameworks || [],
        });
      }
    } catch (error) {
      console.error('Failed to analyze selected repository:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-visible">
      <Card variant="hard" rounded="3xl" className="overflow-visible !border-0 !shadow-none !bg-transparent !p-0 my-6 md:!border-2 md:!shadow-[var(--shadow-brutal)] md:!bg-wharf-surface-primary md:!p-6 md:!mb-6">
        {/* Method Toggle */}
        <div className="flex border-b-2 pb-4 gap-2 border-wharf-border-primary">
          <button
            onClick={() => setImportMethod('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-1 font-mono font-bold text-sm border-2 border-wharf-border-primary transition-colors rounded-2xl ${
              importMethod === 'url'
                ? 'bg-wharf-pink text-wharf-black'
                : 'bg-wharf-surface-secondary hover:bg-wharf-surface-tertiary'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Paste URL
          </button>
          <button
            onClick={() => setImportMethod('github')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-1 font-mono font-bold text-sm border-2 border-wharf-border-primary transition-colors cursor-pointer rounded-2xl ${
              importMethod === 'github'
                ? 'bg-wharf-pink text-wharf-black'
                : 'bg-wharf-surface-secondary hover:bg-wharf-surface-tertiary'
            }`}
            disabled={!user}
          >
            <FaGithub className="w-4 h-4" />
          
            {/* Mobile */}
            <span className="sm:hidden">Import</span>
          
            {/* Tablet & Desktop */}
            <span className="hidden sm:inline">GitHub Import</span>
          
            {!user && (
              <Badge variant="ghost" size="sm" className="ml-1">
                Sign in
              </Badge>
            )}
          </button>
        </div>

        <div className="py-6">
          {importMethod === 'url' ? (
            <div className="space-y-4">
              {/* URL Input Section */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Link2
                      className={`w-4 h-4 transition-colors ${
                        touched && repoUrl
                          ? isValid
                            ? 'text-wharf-green'
                            : 'text-wharf-error'
                          : 'text-wharf-text-tertiary'
                      }`}
                    />
                  </div>
                  <Input
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={handleUrlChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={() => {
                      setTouched(true);
                    }}
                    className={`pl-9 font-mono text-sm transition-all duration-300 rounded-2xl ${
                      touched && repoUrl
                        ? isValid
                          ? 'border-wharf-green/50'
                          : 'border-wharf-error/50'
                        : ''
                    }`}
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
                  variant="primary"
                  rounded="2xl"
                  onClick={handleUrlSubmit}
                  loading={isLoading}
                  disabled={isButtonDisabled}
                  className="min-w-[120px]"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 p-2 bg-wharf-error/5 border border-wharf-error/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-wharf-error flex-shrink-0" />
                  <span className="font-mono text-xs text-wharf-error capitalize">{apiError}</span>
                </div>
              )}

              {/* Validation Message */}
              {touched && repoUrl && !isValid && validation && !apiError && (
                <div className="flex items-center gap-2 p-2 bg-wharf-error/5 border border-wharf-error/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-wharf-error flex-shrink-0" />
                  <span className="font-mono text-xs text-wharf-error capitalize">
                    {validation.message}
                  </span>
                </div>
              )}

              {/* Examples Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-wharf-cyan-darker" />
                    <span className="font-mono text-xs text-wharf-text-tertiary font-bold uppercase tracking-wider">
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
                      className="group relative p-3 border-2 border-wharf-border-secondary hover:border-wharf-pink hover:bg-wharf-pink/5 transition-all rounded-xl text-left cursor-pointer"
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
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-wharf-pink/20 rounded-xl transition-colors pointer-events-none" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* GitHub Import Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaGithub className="w-5 h-5 text-wharf-text-primary" />
                  <span className="font-mono text-sm font-bold">
                    {user ? `${user.username || user.email}'s Repositories` : 'Connect GitHub'}
                  </span>
                </div>
                {user && (
                  <Badge variant="cyan" className="hidden sm:inline-flex gap-1">
                    <Zap className="w-3 h-3" />
                    Personal Access
                  </Badge>
                )}
              </div>

              {/* Repo Selector */}
              <RepoSelector user={user} onSelect={handleRepoSelect} />

              {/* Recent Repositories */}
              {user && recentRepos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-wharf-border-secondary" />
                    <span className="font-mono text-[10px] text-wharf-text-tertiary uppercase tracking-wider">
                      Recent
                    </span>
                    <div className="h-px flex-1 bg-wharf-border-secondary" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className="px-3 py-1 border border-wharf-border-secondary font-mono text-xs hover:border-wharf-pink hover:bg-wharf-pink/10 transition-colors"
                      >
                        {repo.full_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
