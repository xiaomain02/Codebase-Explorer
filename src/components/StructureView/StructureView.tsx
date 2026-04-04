import React from 'react';
import type { RepoStructureResponse, RepoSummaryResponse, ModuleInfo } from '../../api/types';
import './StructureView.module.css';

interface StructureViewProps {
  structure: RepoStructureResponse | null;
  summary: RepoSummaryResponse | null;
  modules: ModuleInfo[];
  currentPath: string;
  onFolderClick: (path: string) => void;
}

export const StructureView: React.FC<StructureViewProps> = ({ 
  structure, 
  summary, 
  modules,
  currentPath,
  onFolderClick 
}) => {
  return (
    <div className="structure-view">
      {/* README секция */}
      {structure?.readme && (
        <div className="card readme-card">
          <h2>README</h2>
          <div className="readme-content">
            <pre>{structure.readme.slice(0, 1500)}</pre>
            {structure.readme.length > 1500 && <p className="truncated">...</p>}
          </div>
        </div>
      )}

      {/* Summary секция */}
      {summary && (
        <div className="card summary-card">
          <div className="card-header">
            <h2>Project Summary</h2>
            <span className="badge">MVP</span>
          </div>
          <p>{summary.summary}</p>
        </div>
      )}

      {/* Current path */}
      {currentPath && (
        <div className="current-path">
          <span className="path-label">Current folder:</span>
          <span className="path-value">{currentPath}</span>
        </div>
      )}

      {/* Модули */}
      {modules.length > 0 && (
        <div className="card modules-card">
          <h2>Modules</h2>
          <div className="modules-grid">
            {modules.map((module, i) => (
              <div key={i} className="module-item">
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <details>
                  <summary>{module.files.length} files</summary>
                  <ul>
                    {module.files.slice(0, 10).map((file, j) => (
                      <li key={j}>{file}</li>
                    ))}
                    {module.files.length > 10 && <li>...</li>}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Текущая структура папки */}
      {structure?.structure && (
        <div className="card structure-card">
          <h2>Contents</h2>
          
          {structure.structure.summary && (
            <div className="folder-summary">
              {structure.structure.summary}
            </div>
          )}

          {/* Подпапки */}
          {structure.structure.subfolders.length > 0 && (
            <div className="subfolders-section">
              <h3>Folders</h3>
              <div className="subfolders-grid">
                {structure.structure.subfolders.map((folder, i) => (
                  <div 
                    key={i} 
                    className="folder-card"
                    onClick={() => onFolderClick(folder.path)}
                  >
                    <span className="folder-icon">📁</span>
                    <div className="folder-info">
                      <div className="folder-name">{folder.path.split('/').pop()}</div>
                      <div className="folder-stats">
                        {folder.files.length} files · {folder.subfolders.length} subfolders
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Файлы с классами и функциями */}
          {structure.structure.files.length > 0 && (
            <div className="files-section">
              <h3>Python Files</h3>
              {structure.structure.files.map((file, i) => (
                <div key={i} className="file-details">
                  <div className="file-details-header">
                    <span className="file-icon">🐍</span>
                    <span className="file-path">{file.file_path}</span>
                  </div>
                  
                  {file.classes.length > 0 && (
                    <div className="classes-section">
                      <strong>Classes:</strong>
                      <div className="classes-list">
                        {file.classes.map((cls, j) => (
                          <div key={j} className="class-chip">
                            <code>{cls.name}</code>
                            {cls.methods.length > 0 && (
                              <span className="method-badge">{cls.methods.length} methods</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {file.functions.length > 0 && (
                    <div className="functions-section">
                      <strong>Functions:</strong>
                      <div className="functions-list">
                        {file.functions.map((func, j) => (
                          <code key={j} className="function-chip">
                            {func.name}({func.args.slice(0, 3).join(', ')})
                            {func.args.length > 3 && '...'}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {structure.structure.files.length === 0 && 
           structure.structure.subfolders.length === 0 && (
            <div className="empty-folder">
              <p>This folder is empty</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};