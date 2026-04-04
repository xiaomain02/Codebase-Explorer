import { useState, useCallback, useEffect } from 'react';
import { reposApi } from '../api/repos';
import type { 
  RepoStructureResponse, 
  RepoTreeResponse,
  RepoSummaryResponse,
  AskResponse,
  ModuleInfo,
} from '../api/types';

export const useRepo = (repoId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<RepoTreeResponse | null>(null);
  const [structure, setStructure] = useState<RepoStructureResponse | null>(null);
  const [summary, setSummary] = useState<RepoSummaryResponse | null>(null);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [answer, setAnswer] = useState<AskResponse | null>(null);

  const loadTree = useCallback(async () => {
    if (!repoId) return;
    try {
      const data = await reposApi.getTree(repoId);
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    }
  }, [repoId]);

  const loadStructure = useCallback(async (path?: string) => {
    if (!repoId) return;
    setLoading(true);
    try {
      const data = path 
        ? await reposApi.getStructureByPath(repoId, path)
        : await reposApi.getStructure(repoId);
      setStructure(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load structure');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  const loadSummary = useCallback(async () => {
    if (!repoId) return;
    try {
      const data = await reposApi.getSummary(repoId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }, [repoId]);

  const loadModules = useCallback(async () => {
    if (!repoId) return;
    try {
      const data = await reposApi.getModules(repoId);
      setModules(data.modules);
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  }, [repoId]);

  const askQuestion = useCallback(async (question: string) => {
    if (!repoId) throw new Error('No repository loaded');
    setLoading(true);
    try {
      const data = await reposApi.askQuestion(repoId, question);
      setAnswer(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    if (repoId) {
      loadTree();
      loadStructure();
      loadSummary();
      loadModules();
    }
  }, [repoId]);

  return {
    loading,
    error,
    tree,
    structure,
    summary,
    modules,
    answer,
    loadStructure,
    askQuestion,
    setAnswer,
  };
};