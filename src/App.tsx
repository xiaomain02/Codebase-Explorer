import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { reposApi } from './api/repos';
import { useRepo } from './hooks/useRepo';
import { StructureView } from './components/StructureView/StructureView';
import { QAPanel, QAItem } from './components/QAPanel/QAPanel';
import { NodeAiDescription } from './components/NodeAiDescription/NodeAiDescription.tsx';
import './App.css';

type TabId = 'node' | 'info' | 'ask';

const X_GAP = 240;
const Y_GAP = 46;
const LS_KEY = 'cbe-state-v1';

function loadState() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveState(data: object) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

function App() {
  const saved = loadState();

  const [repoId, setRepoId] = useState<string>(saved?.repoId || '');
  const [uploaded, setUploaded] = useState<boolean>(saved?.uploaded || false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(saved?.uploaded ? 'info' : 'node');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [rawTree, setRawTree] = useState<any>(saved?.rawTree || null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(saved?.expandedIds || []));
  const [qaHistory, setQaHistory] = useState<QAItem[]>(saved?.qaHistory || []);
  const reactFlowWrapper = useRef<any>(null);

  const {
    loading: repoLoading,
    error,
    structure,
    summary,
    modules,
    askQuestion,
    loadStructure,
    setAnswer,
  } = useRepo(repoId);

  // ── Persist to localStorage ───────────────────
  useEffect(() => {
    if (!repoId) return;
    saveState({ repoId, uploaded, rawTree, expandedIds: [...expandedIds], qaHistory });
  }, [repoId, uploaded, rawTree, expandedIds, qaHistory]);

  // Reset if repoId is stale (backend restarted)
  useEffect(() => {
    if (error && uploaded && repoId) {
      localStorage.removeItem(LS_KEY);
      setUploaded(false); setRepoId(''); setRawTree(null);
      setSelectedNode(null); setQaHistory([]); setExpandedIds(new Set());
    }
  }, [error]);

  const nodeStyle = (isDir: boolean, isExpandable: boolean) => ({
    background: isDir ? '#21262d' : '#161b22',
    border: `1.5px solid ${isDir ? '#a371f7' : '#3fb950'}`,
    borderRadius: '8px',
    padding: '6px 13px',
    width: 'auto',
    minWidth: '80px',
    maxWidth: '170px',
    textAlign: 'center' as const,
    cursor: isExpandable ? 'pointer' : 'default',
    color: isDir ? '#d2a8ff' : '#7ee787',
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: '500',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxShadow: isDir
      ? '0 0 0 1px rgba(163,113,247,.15), 0 4px 12px rgba(0,0,0,.4)'
      : '0 0 0 1px rgba(63,185,80,.12), 0 2px 8px rgba(0,0,0,.3)',
  });

  const buildVisibleGraph = useCallback((tree: any, expanded: Set<string>) => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    let leafCounter = 0;

    const traverse = (node: any, depth: number, parentId: string | null, path: string): number => {
      const nodeId = path;
      const isDir = node.type === 'directory';
      const hasChildren = isDir && node.children && node.children.length > 0;
      const isExpanded = expanded.has(nodeId);
      const visibleChildren = (isExpanded && hasChildren) ? node.children : [];
      const childCount = node.children?.length ?? 0;

      let centerY: number;
      if (visibleChildren.length === 0) {
        centerY = leafCounter * Y_GAP;
        leafCounter++;
      } else {
        const childYs = visibleChildren.map((child: any) =>
          traverse(child, depth + 1, nodeId, `${path}/${child.name}`)
        );
        centerY = (childYs[0] + childYs[childYs.length - 1]) / 2;
      }

      let label = node.name;
      if (isDir && hasChildren) {
        const arrow = isExpanded ? '▾' : '▸';
        const count = !isExpanded ? ` (${childCount})` : '';
        label = `${arrow} ${node.name}${count}`;
      }

      allNodes.push({
        id: nodeId,
        data: { label, type: node.type, original: node, isExpanded, hasChildren },
        position: { x: depth * X_GAP, y: centerY },
        type: 'default',
        style: nodeStyle(isDir, hasChildren),
      });

      if (parentId) {
        allEdges.push({
          id: `${parentId}→${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#30363d', strokeWidth: 1.5 },
        });
      }

      return centerY;
    };

    traverse(tree, 0, null, tree.name);
    return { nodes: allNodes, edges: allEdges };
  }, []);

  useEffect(() => {
    if (!rawTree) return;
    const { nodes: n, edges: e } = buildVisibleGraph(rawTree, expandedIds);
    setNodes(n);
    setEdges(e);
  }, [expandedIds, rawTree, buildVisibleGraph]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const result = await reposApi.upload(file);
      setRepoId(result.repo_id);
      setAnswer(null);
      setQaHistory([]);
      const treeResp = await reposApi.getTree(result.repo_id);
      const tree = treeResp.tree;
      setRawTree(tree);
      setExpandedIds(new Set<string>([tree.name]));
      setUploaded(true);
      setActiveTab('info');
    } catch {
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    const { type, original, hasChildren } = node.data;
    setSelectedNode({ ...original, fullPath: node.id });
    setActiveTab('node');

    if (type === 'directory' && hasChildren) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          const collapse = (n: any, path: string) => {
            next.delete(path);
            n.children?.forEach((c: any) => collapse(c, `${path}/${c.name}`));
          };
          collapse(original, node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    }
  }, []);

  // ── QA с историей ────────────────────────────
  const handleAsk = useCallback(async (question: string) => {
    const result = await askQuestion(question);
    setQaHistory(prev => [
      { question, answer: result?.answer || '', sources: result?.sources || [], collapsed: false },
      ...prev,
    ]);
    return result;
  }, [askQuestion]);

  const toggleQaItem = useCallback((idx: number) => {
    setQaHistory(prev => prev.map((item, i) =>
      i === idx ? { ...item, collapsed: !item.collapsed } : item
    ));
  }, []);

  const clearHistory = useCallback(() => setQaHistory([]), []);

  // ── Reset ─────────────────────────────────────
  const handleReset = () => {
    localStorage.removeItem(LS_KEY);
    setUploaded(false); setRepoId(''); setRawTree(null);
    setSelectedNode(null); setQaHistory([]); setExpandedIds(new Set()); setAnswer(null);
  };

  if (!uploaded) {
    return (
      <div className="upload-page">
        <div className="upload-card">
          <div className="upload-card-eyebrow">v1.0</div>
          <h1>Codebase<span> Explorer</span></h1>
          <p>Upload a ZIP archive and interactively explore its file structure, modules, and contents.</p>
          <div className={`upload-drop-zone${loading ? ' loading' : ''}`}>
            {loading ? (
              <>
                <div className="spinner" />
                <span className="upload-drop-label loading-pulse">Analysing archive…</span>
              </>
            ) : (
              <>
                <span className="upload-drop-icon">📦</span>
                <span className="upload-drop-label">Drop ZIP here or click to browse</span>
                <span className="upload-drop-sub">Maximum file size: 500 MB</span>
                <input type="file" accept=".zip" onChange={handleFileUpload} />
              </>
            )}
          </div>
          <div className="upload-hint">Supports any ZIP archive · Python, JS, and more</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="new-upload-btn" onClick={handleReset}>
          ↑ New Upload
        </button>
        <div className="app-title">Codebase Explorer</div>
        <div className="header-badge">Interactive Tree View</div>
      </header>

      <div className="main-layout">
        <div className="graph-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            attributionPosition="bottom-right"
            minZoom={0.05}
            maxZoom={2}
          >
            <Controls />
            <Background color="#21262d" gap={24} variant={BackgroundVariant.Dots} size={1} />
            <Panel position="top-left" className="graph-info">
              <div>Click folder to expand / collapse</div>
              <div>Drag to move · Scroll to zoom</div>
            </Panel>
          </ReactFlow>
        </div>

        <div className="panel-right">
          <div className="panel-tabs">
            <button className={`panel-tab${activeTab === 'node' ? ' active' : ''}`} onClick={() => setActiveTab('node')}>
              Node Details
            </button>
            <button className={`panel-tab${activeTab === 'info' ? ' active' : ''}`} onClick={() => setActiveTab('info')}>
              Overview
            </button>
            <button className={`panel-tab${activeTab === 'ask' ? ' active' : ''}`} onClick={() => setActiveTab('ask')}>
              Ask{qaHistory.length > 0 && <span className="tab-count">{qaHistory.length}</span>}
            </button>
          </div>

          <div className="panel-body">
            {activeTab === 'node' && (
              selectedNode ? (
                <div className="node-detail">
                  <div className="node-detail-header">
                    <span className="node-detail-icon">
                      {selectedNode.type === 'directory' ? '📁' : '📄'}
                    </span>
                    <div className="node-detail-name">{selectedNode.name}</div>
                  </div>
                  <div className="node-detail-body">
                    <div className="nd-row">
                      <div className="nd-label">Type</div>
                      {selectedNode.type === 'directory'
                        ? <span className="nd-type-dir">📁 Directory</span>
                        : <span className="nd-type-file">📄 File</span>}
                    </div>
                    {selectedNode.type === 'directory' && selectedNode.children && (
                      <div className="nd-row">
                        <div className="nd-label">Children</div>
                        <div className="nd-children-count">{selectedNode.children.length}</div>
                      </div>
                    )}
                    <div className="nd-row">
                      <div className="nd-hint">
                        {selectedNode.type === 'directory'
                          ? 'Click the node in the graph to expand or collapse.'
                          : 'Check the Overview tab for project structure details.'}
                      </div>
                    </div>

                    <NodeAiDescription
                      repoId={repoId}
                      nodePath={selectedNode.fullPath || selectedNode.name}
                      nodeType={selectedNode.type === 'directory' ? 'directory' : 'file'}
                    />
                  </div>
                </div>
              ) : (
                <div className="node-placeholder">
                  <div className="node-placeholder-icon">⬡</div>
                  <p>Click on any node</p>
                  <small>Select a folder or file to see details</small>
                </div>
              )
            )}

            {activeTab === 'info' && (
              <StructureView
                structure={structure}
                summary={summary}
                modules={modules}
                currentPath={structure?.structure?.path || ''}
                onFolderClick={loadStructure}
              />
            )}

            {activeTab === 'ask' && (
              <>
                <QAPanel
                  onAsk={handleAsk}
                  history={qaHistory}
                  onToggle={toggleQaItem}
                  onClear={clearHistory}
                  loading={repoLoading}
                />
                {error && <div className="error-card" style={{ marginTop: 12 }}>⚠ {error}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;