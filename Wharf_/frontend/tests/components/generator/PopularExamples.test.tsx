import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getPopularExample } from '../../../src/data/popularExamplesData';
import { RepoImportSection } from '../../../src/components/generator/RepoImportSection';
import { ChangelogInput } from '../../../src/components/changelog/ChangelogInput';
import { HealthRepoInput } from '../../../src/components/health/HealthRepoInput';

describe('Popular Examples Data & Handlers', () => {
  it('retrieves correct popular example metadata for all 4 supported repositories', () => {
    const reactEx = getPopularExample('facebook/react');
    expect(reactEx).toBeDefined();
    expect(reactEx?.name).toBe('facebook/react');
    expect(reactEx?.repoData.owner).toBe('facebook');
    expect(reactEx?.repoData.repo).toBe('react');
    expect(reactEx?.sampleReadme).toContain('# React');
    expect(reactEx?.sampleReadme).toContain('```tsx');

    const nextEx = getPopularExample('vercel/next.js');
    expect(nextEx).toBeDefined();
    expect(nextEx?.repoData.repo).toBe('next.js');
    expect(nextEx?.sampleReadme).toContain('# Next.js');

    const tailwindEx = getPopularExample('tailwindlabs/tailwindcss');
    expect(tailwindEx).toBeDefined();
    expect(tailwindEx?.sampleReadme).toContain('# Tailwind CSS');

    const vueEx = getPopularExample('vuejs/vue');
    expect(vueEx).toBeDefined();
    expect(vueEx?.sampleReadme).toContain('# Vue.js');
  });

  it('triggers onRepoSelect with repository data and sample README when an example is clicked in RepoImportSection', () => {
    const handleRepoSelect = vi.fn();
    render(<RepoImportSection user={null} onRepoSelect={handleRepoSelect} />);

    const reactBtn = screen.getByText('facebook/react').closest('button');
    expect(reactBtn).not.toBeNull();
    fireEvent.click(reactBtn!);

    expect(handleRepoSelect).toHaveBeenCalledTimes(1);
    const [repoArg, sampleReadmeArg] = handleRepoSelect.mock.calls[0];
    expect(repoArg.owner).toBe('facebook');
    expect(repoArg.repo).toBe('react');
    expect(sampleReadmeArg).toContain('# React');
    expect(sampleReadmeArg).toContain('```tsx');
  });

  it('triggers onSelectExample when an example is clicked in ChangelogInput', () => {
    const handleSelectExample = vi.fn();
    render(
      <ChangelogInput
        repoUrl=""
        setRepoUrl={vi.fn()}
        onAnalyze={vi.fn()}
        isLoading={false}
        onSelectExample={handleSelectExample}
      />
    );

    const nextBtn = screen.getByText('vercel/next.js').closest('button');
    expect(nextBtn).not.toBeNull();
    fireEvent.click(nextBtn!);

    expect(handleSelectExample).toHaveBeenCalledWith('vercel/next.js');
  });

  it('triggers onSelectExample when an example is clicked in HealthRepoInput', () => {
    const handleSelectExample = vi.fn();
    render(
      <HealthRepoInput
        repoUrl=""
        setRepoUrl={vi.fn()}
        onAnalyze={vi.fn()}
        isLoading={false}
        onSelectExample={handleSelectExample}
      />
    );

    const vueBtn = screen.getByText('vuejs/vue').closest('button');
    expect(vueBtn).not.toBeNull();
    fireEvent.click(vueBtn!);

    expect(handleSelectExample).toHaveBeenCalledWith('vuejs/vue');
  });
});
