import { api } from './client';
import type { RepoTreeResponse, RepoStructureResponse, RepoModulesResponse, RepoSummaryResponse, AskResponse } from './types';

export const reposApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/repos/upload', formData);
    return response.data;
  },

  getTree: async (repoId: string): Promise<RepoTreeResponse> => {
    const response = await api.get(`/api/repos/${repoId}/tree`);
    return response.data;
  },

  getStructure: async (repoId: string, path?: string): Promise<RepoStructureResponse> => {
    const url = path ? `/api/repos/${repoId}/structure/${path}` : `/api/repos/${repoId}/structure`;
    const response = await api.get(url);
    return response.data;
  },

  getModules: async (repoId: string): Promise<RepoModulesResponse> => {
    const response = await api.get(`/api/repos/${repoId}/modules`);
    return response.data;
  },

  getSummary: async (repoId: string): Promise<RepoSummaryResponse> => {
    const response = await api.get(`/api/repos/${repoId}/summary`);
    return response.data;
  },

  askQuestion: async (repoId: string, question: string): Promise<AskResponse> => {
    const response = await api.post(`/api/repos/${repoId}/ask`, { question });
    return response.data;
  }
};