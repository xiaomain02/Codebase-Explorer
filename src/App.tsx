import { useState, useCallback, useRef } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { reposApi } from './api/repos';
import { useRepo } from './hooks/useRepo';
import { StructureView } from './components/StructureView/StructureView';
import { QAPanel } from './components/QAPanel/QAPanel';
import './App.css';

function App() {
  const [repoId, setRepoId] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const reactFlowWrapper = useRef<any>(null);
  const {
    loading: repoLoading,
    error,
    structure,
    summary,
    modules,
    answer,
    askQuestion,
    loadStructure,
    setAnswer,
  } = useRepo(repoId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await reposApi.upload(file);
      setRepoId(result.repo_id);
      setAnswer(null);
      const treeData = await reposApi.getTree(result.repo_id);
      
      // Строим граф из дерева
      const { nodes: newNodes, edges: newEdges } = buildGraphFromTree(treeData.tree);
      setNodes(newNodes);
      setEdges(newEdges);
      
      setUploaded(true);
    } catch (error) {
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Рекурсивное построение графа
  const buildGraphFromTree = (tree: any, parentId: string | null = null, x = 0, y = 0, level = 0) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const nodeId = tree.name + Math.random();
    const nodeX = x + level * 250;
    const nodeY = y + nodes.length * 80;
    
    nodes.push({
      id: nodeId,
      data: { label: tree.name, type: tree.type, original: tree },
      position: { x: nodeX, y: nodeY },
      type: 'default',
      style: {
        background: tree.type === 'directory' ? '#e3f2fd' : '#f3e5f5',
        border: '2px solid',
        borderColor: tree.type === 'directory' ? '#1976d2' : '#7b1fa2',
        borderRadius: '50px',
        padding: '10px 20px',
        width: 'auto',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer',
      },
    });
    
    if (parentId) {
      edges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#888', strokeWidth: 2 },
      });
    }
    
    if (tree.children && tree.children.length > 0) {
      let childY = nodeY - (tree.children.length - 1) * 40;
      tree.children.forEach((child: any, index: number) => {
        const childResult = buildGraphFromTree(child, nodeId, nodeX + 50, childY + index * 80, level + 1);
        nodes.push(...childResult.nodes);
        edges.push(...childResult.edges);
      });
    }
    
    return { nodes, edges };
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node.data.original);
  }, []);

  if (!uploaded) {
    return (
      <div className="upload-page">
        <div className="upload-card">
          <h1>Codebase Explorer</h1>
          <p>Upload a ZIP archive to explore your code structure</p>
          <label className="upload-button">
            {loading ? 'Processing...' : 'Select ZIP File'}
            <input type="file" accept=".zip" onChange={handleFileUpload} disabled={loading} hidden />
          </label>
          <div className="upload-hint">Maximum file size: 500 MB</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="new-upload-btn" onClick={() => setUploaded(false)}>
          New Upload
        </button>
        <div className="app-title">Codebase Explorer</div>
        <div className="demo-badge">Interactive Tree View</div>
      </header>

      <div className="main-layout">
        {/* Центр - графическое дерево */}
        <div className="graph-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={1.5}
            defaultViewport={{ x: 100, y: 100, zoom: 0.8 }}
          >
            <Controls />
            <Background color="#e0e0e0" gap={16} />
            <Panel position="top-left" className="graph-info">
              <div> Click on any node to see details</div>
              <div> Drag to move around</div>
              <div> Use scroll to zoom</div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Правая панель - детали и аналитика */}
        <div className="panel-right">
          <div className="panel-header">
            <h3>Workspace</h3>
          </div>

          <div className="details-content">
            {selectedNode ? (
              <div className="details-card">
                <div className="details-header">
                  <span className="details-icon">{selectedNode.type === 'directory' ? '📁' : '📄'}</span>
                  <h4>{selectedNode.name}</h4>
                </div>
                <div className="details-section">
                  <div className="details-section-title">Type</div>
                  <div className="details-type">{selectedNode.type === 'directory' ? 'Directory' : 'File'}</div>
                </div>
                {selectedNode.type === 'directory' && selectedNode.children && (
                  <div className="details-section">
                    <div className="details-section-title">Contents</div>
                    <div className="details-contents">
                      {selectedNode.children.length} items inside
                    </div>
                  </div>
                )}
                {selectedNode.type === 'file' && (
                  <div className="details-section">
                    <div className="details-section-title">Information</div>
                    <div className="details-info">
                      Click on folders to expand the tree. Files can be opened for detailed analysis.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="details-placeholder">
                <div className="placeholder-icon"></div>
                <p>Click on any node</p>
                <p className="placeholder-hint">Select a folder or file to see details</p>
              </div>
            )}

            <div className="api-cards">
              <StructureView
                structure={structure}
                summary={summary}
                modules={modules}
                currentPath={structure?.structure?.path || ''}
                onFolderClick={loadStructure}
              />

              <QAPanel onAsk={askQuestion} answer={answer} loading={repoLoading} />

              {error && (
                <div className="error-card">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;