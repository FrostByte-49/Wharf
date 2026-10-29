import { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout';
import {
  HealthRepoInput,
  HealthScoreCard,
  ScoreBreakdown,
  ScoreSuggestions,
  ContributionScore,
  HealthHistory,
  HealthExportActions,
} from '../components/health';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Activity,
  ArrowLeft,
  ShieldCheck,
  Zap,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  PlusCircle,
  History,
  GitBranch,
  Target,
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { getPopularExample } from '../data/popularExamplesData';

interface HealthData {
  score: number;
  breakdown: {
    description: number;
    installation: number;
    usage: number;
    techStack: number;
    contributing: number;
    license: number;
    visuals: number;
  };
  suggestions: string[];
  contributionScore?: number;
  contributionBreakdown?: {
    hasContributing: boolean;
    hasIssueTemplates: boolean;
    hasPRTemplates: boolean;
    hasCodeOfConduct: boolean;
    hasGoodFirstIssues: boolean;
    hasCommunityLink: boolean;
  };
  contributionSuggestions?: string[];
}

export const HealthPage = () => {
  const { isAuthenticated } = useAuthStore();
  const analytics = useAnalytics();

  // Helper For LocalStorage State Initialization
  const initializeState = <T,>(key: string, defaultValue: T): T => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`wharf_health_${key}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultValue;
        }
      }
    }
    return defaultValue;
  };

  const [appState, setAppState] = useState<'landing' | 'wizard' | 'history'>(() =>
    initializeState('appState', 'landing')
  );
  const [currentStep, setCurrentStep] = useState<number>(() => initializeState('currentStep', 1));
  const [repoUrl, setRepoUrl] = useState<string>(() => initializeState('repoUrl', ''));
  const [analyzedRepoUrl, setAnalyzedRepoUrl] = useState<string>(() =>
    initializeState('analyzedRepoUrl', '')
  );
  const [healthData, setHealthData] = useState<HealthData | null>(() =>
    initializeState('healthData', null)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist State To Sync Across Page Refreshes
  useEffect(() => {
    localStorage.setItem('wharf_health_appState', JSON.stringify(appState));
    localStorage.setItem('wharf_health_currentStep', JSON.stringify(currentStep));
    localStorage.setItem('wharf_health_repoUrl', JSON.stringify(repoUrl));
    localStorage.setItem('wharf_health_analyzedRepoUrl', JSON.stringify(analyzedRepoUrl));
    localStorage.setItem('wharf_health_healthData', JSON.stringify(healthData));
  }, [appState, currentStep, repoUrl, analyzedRepoUrl, healthData]);

  const handleAnalyze = async (urlOverride?: string) => {
    const target = urlOverride ?? repoUrl;
    if (!target) return;

    if (urlOverride) setRepoUrl(urlOverride);
    setError(null);
    setIsLoading(true);

    analytics.track('Health Score Started', { repoUrl: target });

    // Ensure We Switch To Wizard If We Aren't Already
    setAppState('wizard');
    setCurrentStep(1); // Keep Step 1 While Loading To Show The Loader, Then Move To Step 2

    try {
      const [scoreRes, contribRes] = await Promise.all([
        api.post('/health/score', { repoUrl: target }),
        api.post('/health/contribution', { repoUrl: target }),
      ]);

      setHealthData({
        score: scoreRes.data.data.score,
        breakdown: scoreRes.data.data.breakdown,
        suggestions: scoreRes.data.data.suggestions,
        contributionScore: contribRes.data.data.score,
        contributionBreakdown: contribRes.data.data.breakdown,
        contributionSuggestions: contribRes.data.data.suggestions,
      });
      setAnalyzedRepoUrl(target);
      setCurrentStep(2);
      analytics.track('Health Score Generated', {
        repoUrl: target,
        score: scoreRes.data.data.score,
        contributionScore: contribRes.data.data.score,
      });
    } catch (err: unknown) {
      let errorMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;

      if (
        errorMessage &&
        (errorMessage.includes('Not Found') || errorMessage.includes('docs.github.com'))
      ) {
        errorMessage = 'Repository not found or requires authentication.';
      }
      setError(errorMessage || 'Failed to analyze repository. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { step: 1, label: 'Select Repository', icon: GitBranch },
    { step: 2, label: 'Analysis Results', icon: BarChart3 },
  ];

  const canProceedToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2 && healthData) return true;
    return false;
  };

  const LandingState = () => (
    <div className="space-y-12 animate-fadeInUp pb-12">
      <div className="container mx-auto px-4 pt-8">
        <div className="relative text-center max-w-4xl mx-auto py-8">
          <div className="space-y-6 relative">
            <Badge variant="pink" className="gap-2 mx-auto w-fit">
              <ShieldCheck className="w-3 h-3" />
              Repository Health Score
            </Badge>

            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[1.1] uppercase">
              Analyze & Improve
              <br />
              <span className="bg-wharf-green-darker bg-clip-text text-transparent">
                Project Health
              </span>
            </h2>

            <p className="font-mono text-sm md:text-lg text-wharf-text-secondary max-w-2xl mx-auto capitalize">
              Instantly review documentation quality, contribution readiness, & maintainability of
              any public GitHub repository...
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
            <Button
              variant="green"
              size="lg"
              rounded="2xl"
              onClick={() => {
                setRepoUrl('');
                setHealthData(null);
                setCurrentStep(1);
                setAppState('wizard');
              }}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Analyze New Repo
            </Button>
            <Button
              variant="outline"
              size="lg"
              rounded="2xl"
              onClick={() => setAppState('history')}
              disabled={!isAuthenticated}
              icon={<History className="w-4 h-4" />}
            >
              {isAuthenticated ? 'View History' : 'Login to View History'}
            </Button>
          </div>
        </div>
      </div>

      <section className="py-20 bg-wharf-surface-primary border-t-4 border-wharf-border-primary w-full mt-12 rounded-3xl">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="cyan" className="mb-4 gap-2">
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
              Get an actionable, definitive health score in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 max-w-6xl mx-auto w-full mt-8">
            {[
              {
                step: '01',
                title: 'Select Repository',
                desc: 'Enter your GitHub repo URL or pick from history',
                icon: GitBranch,
                color: 'bg-wharf-cyan',
              },
              {
                step: '02',
                title: 'Analyze Health',
                desc: 'Our AI checks README quality & contribution guidelines',
                icon: Activity,
                color: 'bg-wharf-green',
              },
              {
                step: '03',
                title: 'Get Insights',
                desc: 'Receive actionable suggestions for improvement',
                icon: TrendingUp,
                color: 'bg-wharf-yellow',
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
                  <div className="flex flex-col items-center p-2 w-full">
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
              className="flex items-center gap-2 font-mono text-sm font-bold text-wharf-text-secondary hover:text-wharf-green-darker transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back To Dashboard
            </button>

            <HealthHistory onSelect={(url) => handleAnalyze(url)} />
          </div>
        )}

        {appState === 'wizard' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => setAppState('landing')}
                className="flex items-center gap-2 font-mono text-sm font-bold text-wharf-text-secondary hover:text-wharf-green-darker transition-colors group cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back To Dashboard
              </button>
            </div>

            {/* Step Progress Indicator */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-wharf-border-secondary -z-0" />
              <div
                className="absolute top-5 left-0 h-0.5 bg-wharf-green transition-all duration-500 -z-0"
                style={{ width: `${(currentStep - 1) * 100}%` }}
              />

              <div className="flex justify-between relative z-10 w-full max-w-sm mx-auto">
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
                        w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-wharf-background-primary
                        ${
                          isActive
                            ? 'bg-wharf-green border-wharf-border-primary shadow-brutal-sm'
                            : isCompleted
                              ? 'bg-wharf-green border-wharf-border-primary'
                              : 'border-wharf-border-secondary text-wharf-border-secondary'
                        }
                        ${isActive ? '' : isAccessible && !isCompleted ? 'hover:border-wharf-green hover:bg-wharf-green/10 hover:text-wharf-green' : ''}
                        ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-wharf-black" />
                        ) : (
                          <s.icon
                            className={`w-5 h-5 ${isActive ? 'text-wharf-black' : 'text-current'}`}
                          />
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs font-bold hidden sm:block ${
                          isActive ? 'text-wharf-green' : 'text-wharf-text-tertiary'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <Card variant="hard" className="overflow-hidden mb-8">
              <div className="px-2 py-4">
                {/* Step 1: Input */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center mb-8">
                      <h3 className="font-display font-black text-2xl tracking-tighter">
                        Check Repository Health
                      </h3>
                      <p className="font-mono text-sm text-wharf-text-tertiary mt-1 capitalize">
                        Enter a public GitHub repository URL
                      </p>
                    </div>

                    <HealthRepoInput
                      repoUrl={repoUrl}
                      setRepoUrl={setRepoUrl}
                      onAnalyze={() => handleAnalyze()}
                      isLoading={isLoading}
                      apiError={error}
                      onSelectExample={(exampleName) => {
                        const popular = getPopularExample(exampleName);
                        if (popular) {
                          setRepoUrl(popular.repoData.url);
                          setAnalyzedRepoUrl(popular.repoData.url);
                          setHealthData(popular.healthData);
                          setCurrentStep(2);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Step 2: Results */}
                {currentStep === 2 && healthData && (
                  <div className="space-y-4 animate-fadeInUp">
                    {/* Score Overview */}
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-wharf-text-secondary" />
                      <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                        Score Overview
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> 
                      <HealthScoreCard score={healthData.score} />
                      <ContributionScore
                        score={healthData.contributionScore || 0}
                        breakdown={healthData.contributionBreakdown}
                        suggestions={healthData.contributionSuggestions || []}
                      />
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-4 mt-16">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-wharf-text-secondary" />
                        <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                          README Score Breakdown
                        </h2>
                      </div>
                      <ScoreBreakdown breakdown={healthData.breakdown} />
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-4 mt-16">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-wharf-text-secondary" />
                        <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                          Improvement Suggestions
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <ScoreSuggestions suggestions={healthData.suggestions} />
                        </div>
                        <div className="space-y-3">
                          <ScoreSuggestions
                            suggestions={healthData.contributionSuggestions || []}
                            type="contribution"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Export Actions */}
                    <div className="pt-6 mt-6 border-t border-wharf-border-secondary">
                      <HealthExportActions healthData={healthData} repoUrl={analyzedRepoUrl} />
                    </div>
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

