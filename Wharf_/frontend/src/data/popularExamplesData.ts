export interface PopularExample {
  name: string;
  stars: string;
  starsNumber: number;
  forks: number;
  description: string;
  repoData: {
    url: string;
    owner: string;
    repo: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    framework: string[];
  };
  sampleReadme: string;
  changelogData: {
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
  };
  healthData: {
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
    contributionScore: number;
    contributionBreakdown: {
      hasContributing: boolean;
      hasIssueTemplates: boolean;
      hasPRTemplates: boolean;
      hasCodeOfConduct: boolean;
      hasGoodFirstIssues: boolean;
      hasCommunityLink: boolean;
    };
    contributionSuggestions: string[];
  };
}

export const POPULAR_EXAMPLES: Record<string, PopularExample> = {
  'facebook/react': {
    name: 'facebook/react',
    stars: '222k',
    starsNumber: 222000,
    forks: 45200,
    description: 'React UI library',
    repoData: {
      url: 'https://github.com/facebook/react',
      owner: 'facebook',
      repo: 'react',
      description: 'The library for web and native user interfaces.',
      stars: 222000,
      forks: 45200,
      language: 'JavaScript',
      framework: ['React', 'JSX', 'Babel', 'Jest'],
    },
    sampleReadme: `# React

[![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/react)
[![Build Status](https://img.shields.io/github/actions/workflow/status/facebook/react/runtime_build_and_test.yml?branch=main)](https://github.com/facebook/react/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

React is a JavaScript library for building user interfaces with declarative, component-based architecture.

## Features

- **Declarative**: React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.
- **Component-Based**: Build encapsulated components that manage their own state, then compose them to make complex UIs.
- **Learn Once, Write Anywhere**: You can develop new features in React without rewriting existing code. React can also render on the server using Node and power mobile apps using React Native.

## Quick Start

Install React and ReactDOM via your preferred package manager:

\`\`\`bash
npm install react react-dom
\`\`\`

Or using yarn or pnpm:

\`\`\`bash
pnpm add react react-dom
\`\`\`

## Basic Usage

Here is a simple interactive counter component written in React:

\`\`\`tsx
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter-card">
      <h3>Count: {count}</h3>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  );
}
\`\`\`

## Documentation

You can find the React documentation on the official website: [react.dev](https://react.dev).

## Contributing

The main purpose of this repository is to continue evolving React core. We want to make contributing to this project as easy and transparent as possible. Please read our [Contributing Guide](https://github.com/facebook/react/blob/main/CONTRIBUTING.md) to learn about our development process.

## License

React is [MIT licensed](https://github.com/facebook/react/blob/main/LICENSE).
`,
    changelogData: {
      stats: {
        totalCommits: 16540,
        contributors: 1680,
        tags: 154,
        commitsByType: { feat: 45, fix: 28, refactor: 14, breaking: 2, chore: 18 },
      },
      content: `# Changelog

All notable changes to **React** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [18.3.1] - 2024-04-26

### Added
- Added deprecation warnings for legacy APIs in preparation for the next major release.
- Enhanced hydration error reporting with detailed component tree traces.

### Fixed
- Fixed an issue where transition updates could be dropped during rapid state changes.
- Fixed synthetic event dispatch order for nested bubbling handlers.

### Performance
- Reduced bundle size of the production runtime by 3.2KB.

## [18.3.0] - 2024-04-15

### Added
- Exported \`act\` from \`react\` package directly.
- Added strict warnings for deprecated \`findDOMNode\` usage in development mode.

\`\`\`tsx
// Modern act usage without react-dom/test-utils
import { act } from 'react';

await act(async () => {
  render(<App />);
});
\`\`\`
`,
    },
    healthData: {
      score: 96,
      breakdown: {
        description: 100,
        installation: 95,
        usage: 98,
        techStack: 95,
        contributing: 92,
        license: 100,
        visuals: 90,
      },
      suggestions: [
        'Add workflow automation for automated PR labeling',
        'Consider adding interactive sandbox links (StackBlitz / CodeSandbox)',
      ],
      contributionScore: 95,
      contributionBreakdown: {
        hasContributing: true,
        hasIssueTemplates: true,
        hasPRTemplates: true,
        hasCodeOfConduct: true,
        hasGoodFirstIssues: true,
        hasCommunityLink: true,
      },
      contributionSuggestions: [
        'Keep good-first-issue labels regularly groomed for new contributors',
      ],
    },
  },

  'vercel/next.js': {
    name: 'vercel/next.js',
    stars: '120k',
    starsNumber: 120000,
    forks: 26000,
    description: 'React framework',
    repoData: {
      url: 'https://github.com/vercel/next.js',
      owner: 'vercel',
      repo: 'next.js',
      description: 'The React Framework for the Web.',
      stars: 120000,
      forks: 26000,
      language: 'TypeScript',
      framework: ['Next.js', 'React', 'Turbopack'],
    },
    sampleReadme: `# Next.js

[![npm version](https://img.shields.io/npm/v/next.svg?style=flat)](https://www.npmjs.com/package/next)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The React Framework for the Web. Used by some of the world's largest companies, Next.js enables you to create full-stack Web applications by extending the latest React features.

## Getting Started

Create a new Next.js app with \`create-next-app\`:

\`\`\`bash
npx create-next-app@latest my-next-app --typescript --tailwind --eslint
cd my-next-app
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Core Features

- **Server Components**: Render components on the server for faster initial page loads and better SEO.
- **App Router**: File-system based router built on React Server Components with support for layouts, nested routing, and loading states.
- **Optimized Assets**: Built-in Image, Font, and Script optimization.

## Example App Router Page

\`\`\`tsx
// app/page.tsx
export default async function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js</h1>
      <p className="text-lg text-gray-600">Built with Server Components and Tailwind CSS.</p>
    </main>
  );
}
\`\`\`

## License

Next.js is open-source software licensed under the [MIT License](https://github.com/vercel/next.js/blob/canary/license.md).
`,
    changelogData: {
      stats: {
        totalCommits: 28400,
        contributors: 3100,
        tags: 312,
        commitsByType: { feat: 82, fix: 45, refactor: 22, breaking: 4, chore: 30 },
      },
      content: `# Changelog

All notable changes to **Next.js** will be documented in this file.

## [14.2.0] - 2024-04-11

### Features
- **Turbopack for Development**: Accelerated local development with faster compile times.
- **Memory Optimization**: Significant reductions in memory usage during large builds.
- **Server Actions**: Improved ergonomics and error boundary handling.

\`\`\`bash
npm install next@14.2.0 react@latest react-dom@latest
\`\`\`

### Fixes
- Fixed parallel route matching with intercepting routes.
- Corrected streaming metadata behavior in root layout.
`,
    },
    healthData: {
      score: 98,
      breakdown: {
        description: 100,
        installation: 100,
        usage: 98,
        techStack: 96,
        contributing: 95,
        license: 100,
        visuals: 97,
      },
      suggestions: [
        'Ensure all canary tags have corresponding GitHub releases',
      ],
      contributionScore: 97,
      contributionBreakdown: {
        hasContributing: true,
        hasIssueTemplates: true,
        hasPRTemplates: true,
        hasCodeOfConduct: true,
        hasGoodFirstIssues: true,
        hasCommunityLink: true,
      },
      contributionSuggestions: [],
    },
  },

  'tailwindlabs/tailwindcss': {
    name: 'tailwindlabs/tailwindcss',
    stars: '78k',
    starsNumber: 78000,
    forks: 4100,
    description: 'CSS framework',
    repoData: {
      url: 'https://github.com/tailwindlabs/tailwindcss',
      owner: 'tailwindlabs',
      repo: 'tailwindcss',
      description: 'A utility-first CSS framework for rapid UI development.',
      stars: 78000,
      forks: 4100,
      language: 'CSS / TypeScript',
      framework: ['Tailwind CSS', 'PostCSS'],
    },
    sampleReadme: `# Tailwind CSS

[![npm](https://img.shields.io/npm/v/tailwindcss.svg)](https://www.npmjs.com/package/tailwindcss)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE)

A utility-first CSS framework packed with classes like \`flex\`, \`pt-4\`, \`text-center\` and \`rotate-90\` that can be composed to build any design, directly in your markup.

## Installation

Install Tailwind CSS via npm:

\`\`\`bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
\`\`\`

## Configuration

Configure your template paths in \`tailwind.config.js\`:

\`\`\`javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
\`\`\`

## Usage Example

\`\`\`html
<div class="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4">
  <div class="shrink-0">
    <div class="h-12 w-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">W</div>
  </div>
  <div>
    <div class="text-xl font-medium text-black">Wharf Platform</div>
    <p class="text-slate-500">Fast, beautiful documentation generator!</p>
  </div>
</div>
\`\`\`

## License

Tailwind CSS is licensed under the [MIT License](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE).
`,
    changelogData: {
      stats: {
        totalCommits: 5200,
        contributors: 350,
        tags: 120,
        commitsByType: { feat: 34, fix: 18, refactor: 10, breaking: 1, chore: 12 },
      },
      content: `# Changelog

All notable changes to **Tailwind CSS** will be documented in this file.

## [3.4.3] - 2024-03-27

### Fixed
- Fixed issue where complex selector arbitrary variants generated invalid CSS.
- Don't emit empty rules when using \`@apply\` with responsive utilities.

\`\`\`css
@layer components {
  .btn-primary {
    @apply py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow-md;
  }
}
\`\`\`
`,
    },
    healthData: {
      score: 95,
      breakdown: {
        description: 100,
        installation: 98,
        usage: 95,
        techStack: 94,
        contributing: 90,
        license: 100,
        visuals: 92,
      },
      suggestions: [
        'Add visual regression testing badges to README',
      ],
      contributionScore: 92,
      contributionBreakdown: {
        hasContributing: true,
        hasIssueTemplates: true,
        hasPRTemplates: true,
        hasCodeOfConduct: true,
        hasGoodFirstIssues: true,
        hasCommunityLink: true,
      },
      contributionSuggestions: [],
    },
  },

  'vuejs/vue': {
    name: 'vuejs/vue',
    stars: '206k',
    starsNumber: 206000,
    forks: 34100,
    description: 'Vue.js framework',
    repoData: {
      url: 'https://github.com/vuejs/vue',
      owner: 'vuejs',
      repo: 'vue',
      description: '🖖 Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.',
      stars: 206000,
      forks: 34100,
      language: 'TypeScript',
      framework: ['Vue.js', 'Vite', 'TypeScript'],
    },
    sampleReadme: `# Vue.js

[![npm](https://img.shields.io/npm/v/vue.svg)](https://www.npmjs.com/package/vue)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/vuejs/core/blob/main/LICENSE)

Vue (pronounced /vjuː/, like view) is a progressive framework for building user interfaces on the web.

## Quick Start

Create a new Vue project with Vite:

\`\`\`bash
npm create vue@latest
cd my-vue-project
npm install
npm run dev
\`\`\`

## Single File Component Example

\`\`\`vue
<script setup lang="ts">
import { ref } from 'vue'

const greeting = ref('Hello, Vue 3!')
const count = ref(0)
</script>

<template>
  <div class="vue-card">
    <h1>{{ greeting }}</h1>
    <button @click="count++">Clicked {{ count }} times</button>
  </div>
</template>

<style scoped>
.vue-card {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f8fafc;
}
</style>
\`\`\`

## Ecosystem

- [Vue Router](https://router.vuejs.org/) - Official client-side routing
- [Pinia](https://pinia.vuejs.org/) - Intuitive, type safe state management
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## License

Vue.js is open-source software licensed under the [MIT License](https://github.com/vuejs/core/blob/main/LICENSE).
`,
    changelogData: {
      stats: {
        totalCommits: 4900,
        contributors: 430,
        tags: 95,
        commitsByType: { feat: 28, fix: 22, refactor: 15, breaking: 0, chore: 14 },
      },
      content: `# Changelog

All notable changes to **Vue.js** will be documented in this file.

## [3.4.21] - 2024-03-20

### Features
- **Reactivity Optimization**: Fine-grained dependency tracking performance improvements.
- **defineModel**: Promoted to stable in Single File Components.

\`\`\`vue
<!-- Parent.vue -->
<CustomInput v-model="searchText" />
\`\`\`

### Bug Fixes
- Corrected watcher cleanup timing in Suspense boundaries.
- Fixed transition group keyed child reordering glitch.
`,
    },
    healthData: {
      score: 97,
      breakdown: {
        description: 100,
        installation: 96,
        usage: 98,
        techStack: 95,
        contributing: 94,
        license: 100,
        visuals: 96,
      },
      suggestions: [
        'Add automated bundle size monitoring on pull requests',
      ],
      contributionScore: 94,
      contributionBreakdown: {
        hasContributing: true,
        hasIssueTemplates: true,
        hasPRTemplates: true,
        hasCodeOfConduct: true,
        hasGoodFirstIssues: true,
        hasCommunityLink: true,
      },
      contributionSuggestions: [],
    },
  },
};

export const getPopularExample = (name: string): PopularExample | undefined => {
  return POPULAR_EXAMPLES[name] || Object.values(POPULAR_EXAMPLES).find(
    (ex) => ex.name.toLowerCase() === name.toLowerCase() || ex.repoData.repo.toLowerCase() === name.toLowerCase()
  );
};
