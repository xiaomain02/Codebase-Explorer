import axios from 'axios';

const api = axios.create({
  baseURL: '',
  timeout: 60000,
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const reposApi = {
  upload: async (file: File) => {
    console.log('Uploading:', file.name);
    await delay(1000);
    return { repo_id: 'demo-repo-123' };
  },

  getTree: async (repoId: string) => {
    await delay(500);
    return {
      repo_id: repoId,
      tree: {
        name: 'my-project',
        type: 'directory',
        children: [
          { name: 'src', type: 'directory', children: [
            { name: 'App.tsx', type: 'file', children: null },
            { name: 'components', type: 'directory', children: [
              { name: 'Button.tsx', type: 'file', children: null }
            ]}
          ]},
          { name: 'README.md', type: 'file', children: null }
        ]
      }
    };
  },

  getStructure: async (repoId: string) => {
    await delay(600);
    return {
      repo_id: repoId,
      readme: '# Demo Project\n\nThis is a demo.',
      structure: {
        path: '',
        summary: 'Demo project for code analysis',
        readme: null,
        files: [
          {
            file_path: 'src/App.tsx',
            functions: [{ name: 'App', args: [], docstring: 'Main component' }],
            classes: []
          },
          {
            file_path: 'src/components/Button.tsx',
            functions: [{ name: 'Button', args: ['props'], docstring: 'Button component' }],
            classes: [{ name: 'ButtonProps', bases: [], docstring: '', methods: [] }]
          }
        ],
        subfolders: []
      }
    };
  },

  getModules: async (repoId: string) => {
    await delay(400);
    return {
      repo_id: repoId,
      modules: [
        { name: 'components', description: 'UI components', files: ['Button.tsx'] },
        { name: 'pages', description: 'Page components', files: ['App.tsx'] }
      ]
    };
  },

  getSummary: async (repoId: string) => {
    await delay(300);
    return {
      repo_id: repoId,
      summary: 'This is a demo project for codebase exploration.'
    };
  },

  askQuestion: async (repoId: string, question: string) => {
    await delay(800);
    return {
      repo_id: repoId,
      question,
      answer: 'This is a mock answer. The real backend will provide intelligent responses.',
      sources: ['src/App.tsx', 'README.md']
    };
  }
};