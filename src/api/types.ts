export interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  children: TreeNode[] | null;
}

export interface FunctionInfo {
  name: string;
  args: string[];
  docstring: string | null;
}

export interface ClassInfo {
  name: string;
  bases: string[];
  docstring: string | null;
  methods: FunctionInfo[];
}

export interface FileStructure {
  file_path: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export interface FolderStructure {
  path: string;
  files: FileStructure[];
  subfolders: FolderStructure[];
  summary: string | null;
  readme: string | null;
}

export interface RepoStructureResponse {
  repo_id: string;
  structure: FolderStructure;
  readme: string | null;
}

export interface RepoTreeResponse {
  repo_id: string;
  tree: TreeNode;
}

export interface ModuleInfo {
  name: string;
  description: string;
  files: string[];
}

export interface RepoModulesResponse {
  repo_id: string;
  modules: ModuleInfo[];
}

export interface RepoSummaryResponse {
  repo_id: string;
  summary: string;
}

export interface AskResponse {
  repo_id: string;
  question: string;
  answer: string;
  sources: string[];
}