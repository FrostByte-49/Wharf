import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from '../stores/authStore';
import { PageWrapper } from '../components/layout';
import {
  ChangelogInput,
  ChangelogOptions,
  ChangelogExport,
  ChangelogHistory,
  ChangelogGenerationProgress,
} from '../components/changelog';

// Lazy-Load Preview
const ReadmePreview = lazy(() =>
  import('../components/generator/ReadmePreview').then((m) => ({ default: m.ReadmePreview }))
);
const MarkdownFallback = () => (
  <div className="flex items-center justify-center min-h-[200px] font-mono text-sm text-wharf-text-tertiary">
    Loading Preview...
  </div>
);
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Zap,
  Download,
  History,
  PlusCircle,
  Settings2,
  GitBranch,
} from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import api from '../lib/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/useToast';

interface ChangelogData {
  content: string;
  stats: {
    totalCommits: number;
    contributors: number;
    tags: number;
    commitsByType: {
      feat: number;
      fix: number;
      refactor: number;
      breaking: number;
      chore: number;
    };
  };
  versions?: {
    version: string;
    date: string;
    changes: string[];
  }[];
}

interface ChangelogOptionsType {
  commitCount: number;
  includeTags: boolean;
  includeContributors: boolean;
  format: 'keep-a-changelog' | 'simple' | 'json';
  groupByType: boolean;
}

// Interface For The History Item
interface ChangelogHistoryItem {
  repoUrl?: string;
  repoName?: string;
  commitCount?: number;
  generatedAt?: string | number | Date;
}

const getInitialState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const ChangelogPage = () => {
  const { user } = useAuthStore();
  const analytics = useAnalytics();
  const { showToast } = useToast();
  const [appState, setAppState] = useState<'landing' | 'wizard' | 'history'>(() =>
    getInitialState('wharf_changelog_appState', 'landing')
  );
  const [repoUrl, setRepoUrl] = useState(() => getInitialState('wharf_changelog_repoUrl', ''));
  const [changelogData, setChangelogData] = useState<ChangelogData | null>(() =>
    getInitialState('wharf_changelog_data', null)
  );
  const [generatedContent, setGeneratedContent] = useState(() =>
    getInitialState('wharf_changelog_content', '')
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
   const [emptyRepositoryMessage, setEmptyRepositoryMessage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentStep, setCurrentStep] = useState(() =>
    getInitialState('wharf_changelog_currentStep', 1)
  );

  const [options, setOptions] = useState<ChangelogOptionsType>(() =>
    getInitialState('wharf_changelog_options', {
      commitCount: 100,
      includeTags: true,
      includeContributors: true,
      format: 'keep-a-changelog',
      groupByType: true,
    })
  );

  // Persist State To LocalStorage
  useEffect(() => {
    localStorage.setItem('wharf_changelog_appState', JSON.stringify(appState));
    localStorage.setItem('wharf_changelog_repoUrl', JSON.stringify(repoUrl));
    localStorage.setItem('wharf_changelog_options', JSON.stringify(options));
    localStorage.setItem('wharf_changelog_currentStep', JSON.stringify(currentStep));
    localStorage.setItem('wharf_changelog_content', JSON.stringify(generatedContent));
    localStorage.setItem('wharf_changelog_data', JSON.stringify(changelogData));
  }, [appState, repoUrl, options, currentStep, generatedContent, changelogData]);

  // Simulate Progress
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setGenerationProgress(0);
    }
  }, [isGenerating]);

const handleAnalyzeRepo = async () => {
  if (!repoUrl) return;

  setApiError(null);
  setEmptyRepositoryMessage(null);
  setIsAnalyzing(true);

  try {
    const statsRes = await api.post('/changelog/stats', { repoUrl });
    const responseData = statsRes.data;

    // Handle empty repository response
    if (responseData.empty) {
      setEmptyRepositoryMessage(
        responseData.message ||
          'No commits or release tags found in this repository.'
      );
      setChangelogData(null);
      return;
    }

    const stats = responseData.data;

    // Handle repository with no commits and no tags
    if (stats.totalCommits === 0 && stats.tags === 0) {
      setEmptyRepositoryMessage(
        'No commits or release tags found in this repository.'
      );
      setChangelogData(null);
      return;
    }

    setChangelogData((prev) => ({
      content: prev?.content || '',
      stats,
    }));

    setCurrentStep(2);

    analytics.track('Changelog Repo Analyzed', {
      repoUrl,
      totalCommits: stats.totalCommits,
    });

    // Adjust options to the available commit count
    const max = Math.min(stats.totalCommits, 500);

    if (options.commitCount > max) {
      setOptions((prev) => ({
        ...prev,
        commitCount: max,
      }));
    }
  } catch (err) {
    console.error('Failed to get stats:', err);

    let errorMsg =
      'Failed to analyze repository. Please check if it exists.';

    if (err && typeof err === 'object' && 'response' in err) {
      const errorResponse = err as {
        response?: {
          data?: {
            error?: string;
            message?: string;
          };
        };
      };

      const responseError =
        errorResponse.response?.data?.error ||
        errorResponse.response?.data?.message;

      if (responseError) {
        errorMsg = responseError;
      }
    }

    if (
      errorMsg.includes('Not Found') ||
      errorMsg.includes('docs.github.com')
    ) {
      errorMsg = 'Repository not found or requires authentication.';
    }

    setApiError(errorMsg);

    const titleCasedMsg = errorMsg
      .split(' ')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()
      )
      .join(' ');

    showToast(titleCasedMsg, 'error');
  } finally {
    setIsAnalyzing(false);
  }
};


  const handleGenerateChangelog = async () => {
    if (!repoUrl) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setGenerationProgress(0);
    setCurrentStep(3);

    try {
      const apiUrl = api.defaults.baseURL || 'http://localhost:3000/api';
      const token = useAuthStore.getState().token;
      const response = await fetch(`${apiUrl}/changelog/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ repoUrl, options }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const errData = await response.json();
            let message = errData?.error || errData?.message || 'Too Many Requests';
            message = message.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
            window.dispatchEvent(new CustomEvent('api:rate-limit', { detail: { message } }));
          } catch {
            window.dispatchEvent(new CustomEvent('api:rate-limit', { detail: { message: 'Too Many Requests' } }));
          }
          throw new Error('Failed to generate changelog (Rate Limited)');
        }
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) {
        throw new Error('Failed to start stream');
      }

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;

          const dataStr = cleanLine.slice(6);
          if (dataStr === '[DONE]') {
            setGenerationProgress(100);
            setRefreshTrigger((prev) => prev + 1);
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              console.error(parsed.error);
              const errText = parsed.error;
              const isKeyExhaustion = errText.toLowerCase().includes('no api keys') || (errText.toLowerCase().includes('key') && errText.toLowerCase().includes('exhaust'));

              let displayMsg = errText;
              if (isKeyExhaustion) {
                displayMsg = 'All API Keys Are Exhausted. Add Your Own API Key In Settings To Continue.';
              } else {
                displayMsg = errText.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
              }

              showToast(displayMsg, isKeyExhaustion ? 'warning' : 'error');
              setIsGenerating(false);
              setCurrentStep(2);
              break;
            }
            if (parsed.text) {
              setGeneratedContent((prev) => prev + parsed.text);
              setGenerationProgress((prev) => Math.min(prev + 0.5, 95));
            }
          } catch {
            // Partial JSON
          }
        }
      }

      analytics.track('Changelog Generated', { repoUrl, format: options.format, commitCount: options.commitCount });
    } catch (error: any) {
      console.error('Failed to generate changelog:', error);
      const errMsg = error.message || 'Changelog Generation Failed. Please Try Again.';
      const titleCasedMsg = errMsg.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      showToast(titleCasedMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const steps = [
    { step: 1, label: 'Enter Repository', icon: GitBranch },
    { step: 2, label: 'Configure Options', icon: Settings2 },
    { step: 3, label: 'Generate', icon: Zap },
    { step: 4, label: 'Export', icon: Download },
  ];

  const canProceedToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2 && changelogData?.stats) return true;
    if (step === 3 && generatedContent) return true;
    if (step === 4 && generatedContent) return true;
    return false;
  };

  const ChangelogUserStatsSection = ({ refreshTrigger }: { refreshTrigger?: number }) => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
      totalRepos: 0,
      changelogsGenerated: 0,
      totalCommits: 0,
      avgCommits: 0,
      lastGenerated: '--',
    });

    useEffect(() => {
      if (!user) return;

      let isMounted = true;

      const fetchStats = async () => {
        try {
          setIsLoading(true);
          const response = await api.get('/changelog/history');
          if (!isMounted) return;

          const data = response.data;
          if (!data?.success) {
            if (isMounted) setIsLoading(false);
            return;
          }

          const history = data.data;

          if (!history || history.length === 0) {
            setStats({
              totalRepos: 0,
              changelogsGenerated: 0,
              totalCommits: 0,
              avgCommits: 0,
              lastGenerated: '--',
            });
            setIsLoading(false);
            return;
          }

          const uniqueRepos = new Set(
            history.map((r: ChangelogHistoryItem) => r.repoUrl || r.repoName)
          );
          let totalCommits = 0;
          let latestDate = 0;

          history.forEach((r: ChangelogHistoryItem) => {
            totalCommits += r.commitCount || 0;
            const date = new Date(r.generatedAt || Date.now()).getTime();
            if (date > latestDate) latestDate = date;
          });

          const targetStats = {
            totalRepos: uniqueRepos.size,
            changelogsGenerated: history.length,
            totalCommits,
            avgCommits: Math.round(totalCommits / history.length),
            lastGenerated: new Date(latestDate).toLocaleDateString(),
          };

          const duration = 1500;
          const steps = 30;
          const interval = duration / steps;
          let currentStep = 0;

          const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            if (isMounted) {
              setStats({
                totalRepos: Math.floor(targetStats.totalRepos * progress),
                changelogsGenerated: Math.floor(targetStats.changelogsGenerated * progress),
                totalCommits: Math.floor(targetStats.totalCommits * progress),
                avgCommits: Math.floor(targetStats.avgCommits * progress),
                lastGenerated: currentStep > steps / 2 ? targetStats.lastGenerated : '--',
              });
            }

            if (currentStep >= steps) {
              clearInterval(timer);
            }
          }, interval);

          setIsLoading(false);
          return () => clearInterval(timer);
        } catch (err) {
          console.error('Failed to fetch user stats:', err);
          if (isMounted) setIsLoading(false);
        }
      };

      fetchStats();
      return () => {
        isMounted = false;
      };
    }, [user, refreshTrigger]);

    const statItems = [
      {
        label: 'Repositories',
        value: isLoading ? '--' : stats.totalRepos.toLocaleString(),
        icon: GitBranch,
        color: 'bg-wharf-pink',
        description: 'Total repos analyzed',
      },
      {
        label: 'Changelogs',
        value: isLoading ? '--' : stats.changelogsGenerated.toLocaleString(),
        icon: FileText,
        color: 'bg-wharf-cyan',
        description: 'Logs created by you',
      },
      {
        label: 'Total Commits',
        value: isLoading ? '--' : stats.totalCommits.toLocaleString(),
        icon: Zap,
        color: 'bg-wharf-yellow',
        description: 'Commits analyzed',
      },
      {
        label: 'Avg Commits',
        value: isLoading ? '--' : `${stats.avgCommits}`,
        icon: CheckCircle,
        color: 'bg-wharf-purple',
        description: 'Commits per changelog',
      },
    ];

    if (!user) {
      return (
        <section className="py-20 bg-wharf-surface-secondary border-y-4 border-wharf-border-primary w-full mt-12">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <Badge variant="default" className="gap-2 mx-auto w-fit">
                <History className="w-3 h-3" />
                Your Stats
              </Badge>
              <p className="font-mono text-sm text-wharf-text-tertiary mt-3 capitalize">
                Sign in to see Your Personal Stats
              </p>
              <Button
                variant="cyan"
                size="sm"
                className="mt-3"
                onClick={() => (window.location.href = '/login')}
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="py-20 bg-wharf-background-primary border-y-4 border-wharf-border-primary w-full mt-12 rounded-[24px]">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="cyan" className="mb-4 gap-2">
              <History className="w-3 h-3" />
              Your Stats
            </Badge>
            <h2 className="font-display font-black text-4xl md:text-5xl tracking-tighter mb-4">
              Your{' '}
              <span className="bg-wharf-green-darker bg-clip-text text-transparent">
                Activity
              </span>
            </h2>
            <p className="font-mono text-base text-wharf-text-secondary max-w-2xl mx-auto capitalize">
              Your personal changelog analytics
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
            {statItems.map((stat) => (
              <Card
                key={stat.label}
                variant="hard-sm"
                className="text-center group hover:translate-y-[-2px] transition-all duration-300 rounded-[24px]"
              >
                <div className="flex flex-col items-center p-2">
                  <div
                    className={`w-10 h-10 ${stat.color} border-2 border-wharf-border-primary flex items-center justify-center mb-3 shadow-brutal-sm group-hover:shadow-brutal transition-all`}
                  >
                    <stat.icon className="w-5 h-5 text-wharf-black" />
                  </div>
                  <div className="font-display font-black text-2xl md:text-3xl tracking-tighter capitalize">
                    {stat.value}
                  </div>
                  <div className="font-mono text-xs text-wharf-text-secondary mt-1 capitalize">
                    {stat.label}
                  </div>
                  <div className="font-mono text-[10px] text-wharf-text-tertiary mt-0.5 capitalize">
                    {stat.description}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const LandingState = () => (
    <div className="space-y-12 animate-fadeInUp pb-12">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-8">
        <div className="relative text-center max-w-5xl mx-auto py-8">
          <div className="space-y-6 relative">
            <Badge variant="cyan" className="gap-2 mx-auto w-fit">
              <GitBranch className="w-3 h-3" />
              Changelog Generator
            </Badge>

            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[1.1] uppercase">
              Auto-Generate
              <br />
              <span className="bg-wharf-cyan-darker bg-clip-text text-transparent">
                CHANGELOG's
              </span>
            </h2>

            <p className="font-mono text-sm md:text-lg text-wharf-text-secondary max-w-2xl mx-auto capitalize">
              Generate beautiful, well-structured CHANGELOG.md from your commit history in
              seconds...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
            <Button
              variant="cyan"
              size="lg"
              rounded="2xl"
              onClick={() => {
                setGeneratedContent('');
                setChangelogData(null);
                setCurrentStep(1);
                setAppState('wizard');
              }}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Create New Changelog
            </Button>
            <Button
              variant="outline"
              size="lg"
              rounded="2xl"
              onClick={() => setAppState('history')}
              disabled={!user}
              icon={<History className="w-4 h-4" />}
            >
              {user ? 'View History' : 'Login to View History'}
            </Button>
          </div>
        </div>
      </div>

      {/* User Stats Section */}
      <ChangelogUserStatsSection refreshTrigger={refreshTrigger} />

      {/* How It Works */}
      <section className="py-20 bg-wharf-surface-primary mt-[-2rem]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="pink" className="mb-4 gap-2">
              <Zap className="w-3 h-3" />
              Simple Process
            </Badge>
            <h2 className="font-display font-black text-4xl md:text-5xl tracking-tighter mb-4">
              How It{' '}
              <span className="bg-wharf-cyan-darker bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="font-mono text-base text-wharf-text-secondary max-w-2xl mx-auto capitalize">
              Three simple steps to generate a professional changelog
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 max-w-6xl mx-auto w-full">
            {[
              {
                step: '01',
                title: 'Enter Repository',
                desc: 'Paste your GitHub repository URL',
                icon: GitBranch,
                color: 'bg-wharf-cyan',
              },
              {
                step: '02',
                title: 'Configure Settings',
                desc: 'Choose commit range, tags & format',
                icon: Settings2,
                color: 'bg-wharf-yellow',
              },
              {
                step: '03',
                title: 'Generate & Export',
                desc: 'Get your CHANGELOG in seconds',
                icon: Zap,
                color: 'bg-wharf-green',
              },
            ].map((item, index) => (
              <div key={item.step} className="relative w-full">
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-16 w-16 h-0.75 bg-wharf-border-primary" />
                )}

                <Card
                  variant="hard"
                  rounded="3xl"
                  className="text-center h-full w-full hover:translate-y-[-4px] transition-all duration-300"
                >
                  <div className="flex flex-col items-center p-4 md:p-6 w-full">
                    <div
                      className={`w-12 h-12 ${item.color} border-2 border-wharf-border-primary flex items-center justify-center mb-4 shadow-brutal-sm flex-shrink-0`}
                    >
                      <span className="font-mono font-black text-sm text-wharf-black">
                        {item.step}
                      </span>
                    </div>

                    <div className="w-16 h-16 border-2 border-wharf-border-primary bg-wharf-surface-primary flex items-center justify-center mb-4 shadow-brutal-sm flex-shrink-0">
                      <item.icon className="w-8 h-8 text-wharf-text-primary" />
                    </div>

                    <h3 className="font-display font-black text-xl mb-2 text-center">
                      {item.title}
                    </h3>
                    <p className="font-mono text-sm text-wharf-text-secondary text-center max-w-xs capitalize">
                      {item.desc}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  if (appState === 'landing') {
    return (
      <main className="min-h-screen">
        <LandingState />
      </main>
    );
  }

  return (
    <PageWrapper title="" description="">
      <div className="max-w-7xl mx-auto space-y-8">
        {appState === 'history' && (
          <div className="space-y-6 animate-fadeInUp">
            <button
              onClick={() => setAppState('landing')}
              className="flex items-center gap-2 font-mono text-sm font-bold text-wharf-text-secondary hover:text-wharf-cyan-darker transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back To Dashboard
            </button>
            <ChangelogHistory />
          </div>
        )}

        {appState === 'wizard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => setAppState('landing')}
                className="flex items-center gap-2 font-mono text-sm font-bold text-wharf-text-secondary hover:text-wharf-cyan-darker transition-colors group cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back To Dashboard
              </button>
              {repoUrl && (
                <Badge variant="cyan" className="gap-1.5">
                  <GitBranch className="w-3 h-3" />
                  {repoUrl.split('/').slice(-2).join('/')}
                </Badge>
              )}
            </div>

            {/* Step Progress Indicator */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-wharf-border-secondary -z-0" />
              <div
                className="absolute top-5 left-0 h-0.5 bg-wharf-cyan transition-all duration-500 -z-0"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />

              <div className="flex justify-between relative z-10">
                {steps.map((s) => {
                  const isActive = currentStep === s.step;
                  const isCompleted = currentStep > s.step;
                  const isAccessible = canProceedToStep(s.step);

                  return (
                    <button
                      key={s.step}
                      onClick={() => {
                        if (canProceedToStep(s.step)) {
                          setCurrentStep(s.step);
                        }
                      }}
                      disabled={!isAccessible}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`
                        w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                        ${
                          isActive
                            ? 'bg-wharf-cyan border-wharf-border-primary shadow-brutal-sm'
                            : isCompleted
                              ? 'bg-wharf-green border-wharf-border-primary'
                              : 'bg-wharf-surface-secondary border-wharf-border-secondary'
                        }
                        ${isAccessible && !isActive && !isCompleted ? 'hover:border-wharf-cyan hover:bg-wharf-cyan/10' : ''}
                        ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-wharf-black" />
                        ) : (
                          <s.icon
                            className={`w-5 h-5 ${isActive ? 'text-wharf-black' : 'text-wharf-text-tertiary'}`}
                          />
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs font-bold hidden sm:block ${
                          isActive ? 'text-wharf-cyan-darker' : 'text-wharf-text-tertiary'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Card */}
            <Card variant="hard" className="overflow-hidden mb-16">
              <div className="px-2 py-4 sm:p-6 md:p-8">                {/* Step 1: Enter Repository */}
{currentStep === 1 && (
  <div className="space-y-6 animate-fadeInUp">
    <div className="text-center mb-8">
      <h3 className="font-display font-black text-2xl tracking-tighter">
        Enter Your Repository
      </h3>
      <p className="font-mono text-sm text-wharf-text-tertiary mt-1 capitalize">
        Paste a GitHub URL to generate a changelog from its commit history
      </p>
    </div>

    <ChangelogInput
      repoUrl={repoUrl}
      setRepoUrl={setRepoUrl}
      onAnalyze={handleAnalyzeRepo}
      isLoading={isAnalyzing}
      apiError={apiError}
    />

    {emptyRepositoryMessage && (
      <div
        role="status"
        className="mt-4 rounded-xl border-2 border-wharf-border-primary bg-wharf-surface-secondary p-5 text-center"
      >
        <CheckCircle className="mx-auto mb-3 h-8 w-8 text-wharf-cyan" />

        <h4 className="font-display text-lg font-bold">
          Empty Repository
        </h4>

        <p className="mt-2 font-mono text-sm text-wharf-text-secondary">
          {emptyRepositoryMessage}
        </p>
      </div>
    )}
  </div>
)}


                {/* Step 2: Configure Options */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center mb-8">
                      <h3 className="font-display font-black text-2xl tracking-tighter">
                        Configure Your Changelog
                      </h3>
                      <p className="font-mono text-sm text-wharf-text-tertiary mt-1 capitalize">
                        Customize how your changelog is generated
                      </p>
                    </div>

                    <ChangelogOptions
                      options={options}
                      onChange={setOptions}
                      stats={changelogData?.stats}
                    />

                    <div className="flex justify-between mt-6 pt-4 border-t-2 border-wharf-border-secondary">
                      <Button
                        variant="outline"
                        rounded="2xl"
                        onClick={prevStep}
                        icon={<ArrowLeft className="w-4 h-4" />}
                        disabled={isGenerating}
                      >
                        Back
                      </Button>
                      <Button
                        variant="cyan"
                        rounded="2xl"
                        onClick={handleGenerateChangelog}
                        icon={<Zap className="w-4 h-4" />}
                        loading={isGenerating}
                      >
                        {/* Mobile */}
                        <span className="block md:hidden">
                          {isGenerating ? 'Generating...' : 'Generate'}
                        </span>

                        {/* Desktop */}
                        <span className="hidden md:block">
                          {isGenerating ? 'Generating...' : 'Generate Changelog'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Generate */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center mb-8">
                      <h3 className="font-display font-black text-2xl tracking-tighter">
                        {isGenerating ? 'Generating Your Changelog' : 'Preview Your Changelog'}
                      </h3>
                      <p className="font-mono text-sm text-wharf-text-tertiary mt-1 capitalize">
                        {isGenerating
                          ? 'AI is analyzing commits & generating changelog...'
                          : 'Review & edit your generated changelog'}
                      </p>
                    </div>

                    {isGenerating && !generatedContent && (
                      <ChangelogGenerationProgress progress={generationProgress} currentStep={generationProgress > 80 ? 2 : generationProgress > 30 ? 1 : 0} />
                    )}

                    {generatedContent && !isGenerating && (
                      <>
                        <Suspense fallback={<MarkdownFallback />}>
                          <ReadmePreview
                            content={generatedContent}
                            isGenerating={false}
                            onContentChange={setGeneratedContent}
                          />
                        </Suspense>
                        <div className="flex justify-between mt-6 pt-4 border-t-2 border-wharf-border-secondary">
                          <Button
                            variant="outline"
                            rounded="2xl"
                            onClick={prevStep}
                            icon={<ArrowLeft className="w-4 h-4" />}
                          >
                            <span className="block md:hidden">Back</span>
                            <span className="hidden md:block">Back to Options</span>
                          </Button>
                          <Button
                            variant="cyan"
                            rounded="2xl"
                            onClick={() => setCurrentStep(4)}
                            iconPosition="right"
                            icon={<ArrowRight className="w-4 h-4" />}
                          >
                            <span className="block md:hidden">Next</span>
                            <span className="hidden md:block">Continue to Export</span>
                          </Button>
                        </div>
                      </>
                    )}

                    {generatedContent && isGenerating && (
                      <Suspense fallback={<MarkdownFallback />}>
                        <ReadmePreview content={generatedContent} isGenerating={true} />
                      </Suspense>
                    )}
                  </div>
                )}

                {/* Step 4: Export */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center mb-8">
                      <h3 className="font-display font-black text-2xl tracking-tighter">
                        Export Your Changelog
                      </h3>
                      <p className="font-mono text-sm text-wharf-text-tertiary mt-1 capitalize">
                        Save or download your changelog
                      </p>
                    </div>

                    {generatedContent ? (
                      <>
                        <div className="bg-wharf-surface-secondary border-2 border-wharf-border-primary p-4 mb-4 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-wharf-cyan-darker" />
                            <span className="font-mono font-bold text-sm">CHANGELOG.md</span>
                          </div>
                          <p className="font-mono text-xs text-wharf-text-secondary">
                            {generatedContent.split(' ').length} Words |{' '}
                            {changelogData?.stats?.totalCommits || 0} Commits
                          </p>
                        </div>
                        <ChangelogExport content={generatedContent} />
                        <div className="flex justify-start mt-6 pt-4 border-t-2 border-wharf-border-secondary">
                          <Button
                            variant="outline"
                            rounded="2xl"
                            onClick={prevStep}
                            icon={<ArrowLeft className="w-4 h-4" />}
                          >
                            Back to Preview
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="font-mono text-wharf-text-secondary capitalize">
                          Generate a changelog first...
                        </p>
                        <Button
                          variant="outline"
                          rounded="2xl"
                          onClick={() => setCurrentStep(1)}
                          className="mt-4"
                        >
                          Start Over
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

