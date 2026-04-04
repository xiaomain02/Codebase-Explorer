import { useState } from 'react';
import { FiFolder, FiFolderPlus, FiFile, FiChevronRight, FiChevronDown } from 'react-icons/fi';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface FileTreeProps {
  tree: TreeNode;
  onFileSelect: (path: string) => void;
  onFolderSelect?: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ tree, onFileSelect, onFolderSelect }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
    if (onFolderSelect) onFolderSelect(path);
  };

  const buildPath = (node: TreeNode, ancestors: string[] = []): string => {
    return [...ancestors, node.name].join('/');
  };

  const renderTree = (node: TreeNode, ancestors: string[] = [], level: number = 0) => {
    const fullPath = buildPath(node, ancestors);
    const isExpanded = expanded[fullPath];
    const paddingLeft = level * 24;

    if (node.type === 'file') {
      return (
        <div 
          key={fullPath}
          className="tree-item file"
          style={{ paddingLeft }}
          onClick={() => onFileSelect(fullPath)}
        >
          <FiFile className="tree-icon" />
          <span className="tree-name">{node.name}</span>
        </div>
      );
    }

    return (
      <div key={fullPath} className="tree-folder">
        <div 
          className="tree-item folder"
          style={{ paddingLeft }}
          onClick={() => toggleExpand(fullPath)}
        >
          {isExpanded ? (
            <FiChevronDown className="tree-chevron" />
          ) : (
            <FiChevronRight className="tree-chevron" />
          )}
          {isExpanded ? (
            <FiFolder className="tree-icon folder-open" />
          ) : (
            <FiFolderPlus className="tree-icon" />
          )}
          <span className="tree-name">{node.name}</span>
          {node.children && (
            <span className="tree-badge">{node.children.length}</span>
          )}
        </div>
        {isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map(child => renderTree(child, [...ancestors, node.name], level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree-container">
      {renderTree(tree)}
    </div>
  );
};