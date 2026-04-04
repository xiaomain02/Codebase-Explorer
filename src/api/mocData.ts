import type {
  TreeNode,
  RepoStructureResponse,
  RepoTreeResponse,
  RepoModulesResponse,
  RepoSummaryResponse,
  AskResponse,
} from './types';

export const mockRepoId = 'mock-repo-123';

export const mockTree: RepoTreeResponse = {
  repo_id: mockRepoId,
  tree: {
    name: 'my-awesome-project',
    type: 'directory',
    children: [
      {
        name: 'src',
        type: 'directory',
        children: [
          {
            name: 'components',
            type: 'directory',
            children: [
              { name: 'Button.tsx', type: 'file', children: null },
              { name: 'Header.tsx', type: 'file', children: null },
              { name: 'Footer.tsx', type: 'file', children: null },
            ],
          },
          {
            name: 'pages',
            type: 'directory',
            children: [
              { name: 'Home.tsx', type: 'file', children: null },
              { name: 'About.tsx', type: 'file', children: null },
            ],
          },
          { name: 'App.tsx', type: 'file', children: null },
          { name: 'main.tsx', type: 'file', children: null },
        ],
      },
      {
        name: 'tests',
        type: 'directory',
        children: [
          { name: 'test_utils.py', type: 'file', children: null },
        ],
      },
      { name: 'README.md', type: 'file', children: null },
      { name: 'package.json', type: 'file', children: null },
    ],
  },
};

export const mockStructure: RepoStructureResponse = {
  repo_id: mockRepoId,
  readme: '# My Awesome Project\n\nThis is a sample project that demonstrates code analysis.\n\n## Features\n- Automatic code parsing\n- Class and function extraction\n- Module detection',
  structure: {
    path: '',
    summary: 'Full-stack web application with React and FastAPI. Provides code analysis with AST parsing.',
    readme: '# My Awesome Project\n\nThis is a sample project...',
    files: [
      {
        file_path: 'src/components/Button.tsx',
        functions: [
          { name: 'Button', args: ['props'], docstring: 'Button component' },
          { name: 'handleClick', args: ['onClick'], docstring: 'Click handler' },
        ],
        classes: [
          {
            name: 'ButtonProps',
            bases: ['object'],
            docstring: 'Button props interface',
            methods: [],
          },
        ],
      },
      {
        file_path: 'src/App.tsx',
        functions: [
          { name: 'App', args: [], docstring: 'Main app component' },
        ],
        classes: [],
      },
      {
        file_path: 'src/utils/helpers.ts',
        functions: [
          { name: 'formatDate', args: ['date', 'format'], docstring: 'Formats date' },
          { name: 'validateEmail', args: ['email'], docstring: 'Validates email' },
        ],
        classes: [],
      },
    ],
    subfolders: [
      {
        path: 'src/components',
        summary: 'Reusable UI components.',
        readme: null,
        files: [
          {
            file_path: 'src/components/Button.tsx',
            functions: [{ name: 'Button', args: ['props'], docstring: 'Button component' }],
            classes: [],
          },
        ],
        subfolders: [],
      },
      {
        path: 'src/pages',
        summary: 'Page components.',
        readme: null,
        files: [
          {
            file_path: 'src/pages/Home.tsx',
            functions: [{ name: 'Home', args: [], docstring: 'Home page' }],
            classes: [],
          },
        ],
        subfolders: [],
      },
    ],
  },
};

export const mockModules: RepoModulesResponse = {
  repo_id: mockRepoId,
  modules: [
    {
      name: 'components',
      description: 'Reusable UI components.',
      files: ['src/components/Button.tsx', 'src/components/Header.tsx', 'src/components/Footer.tsx'],
    },
    {
      name: 'pages',
      description: 'Page-level components.',
      files: ['src/pages/Home.tsx', 'src/pages/About.tsx'],
    },
    {
      name: 'utils',
      description: 'Helper functions.',
      files: ['src/utils/helpers.ts'],
    },
  ],
};

export const mockSummary: RepoSummaryResponse = {
  repo_id: mockRepoId,
  summary: 'Web application for codebase analysis. Includes React components, utility functions, and modular architecture.',
};

export const getMockAnswer = (question: string): AskResponse => {
  const answers: Record<string, string> = {
    upload: 'Upload accepts ZIP files up to 500MB, extracts and analyzes code using AST.',
    class: 'Classes are extracted from Python files with name, bases, docstring, and methods.',
    function: 'Functions are parsed with name, arguments, and docstring.',
    default: 'This tool analyzes code structure, extracts classes/functions, and provides navigation through folders.',
  };

  const lowerQuestion = question.toLowerCase();
  let answer = answers.default;
  
  for (const [key, value] of Object.entries(answers)) {
    if (lowerQuestion.includes(key)) {
      answer = value;
      break;
    }
  }

  return {
    repo_id: mockRepoId,
    question,
    answer,
    sources: ['src/App.tsx', 'src/components/Button.tsx', 'README.md'],
  };
};