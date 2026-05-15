import React, { useState } from 'react';
import type { RepoStructureResponse, RepoSummaryResponse, ModuleInfo } from '../../api/types';

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
  onFolderClick,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const toggleModule = (i: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // 🔹 Вычисляет путь к родительской папке
  const getParentPath = (path: string) => {
    if (!path || path === '.') return '.';
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '.';
  };

  return (
    <div className="info-section">
      {/* AI Summary */}
      {summary && (
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-title">
              <span></span> Project Summary
            </div>
          </div>
          <div className="info-card-body">
            <div className="summary-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {summary.summary}
            </div>
          </div>
        </div>
      )}

      {/* Modules */}
      {modules.length > 0 && (
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-title">
              <span>⊞</span> Modules
            </div>
          </div>
          <div className="info-card-body" style={{ padding: '0 14px' }}>
            {modules.map((mod, i) => (
              <div key={i} className="module-item">
                <div className="module-name">{mod.name}</div>
                <div className="module-desc">{mod.description}</div>
                <button className="module-files-toggle" onClick={() => toggleModule(i)}>
                  {expandedModules.has(i) ? '▾' : '▸'} {mod.files.length} files
                </button>
                {expandedModules.has(i) && (
                  <div className="module-files-list">
                    {mod.files.slice(0, 12).map((f, j) => (
                      <div key={j} className="module-file">{f}</div>
                    ))}
                    {mod.files.length > 12 && (
                      <div className="module-file" style={{ color: 'var(--muted-2)' }}>
                        +{mod.files.length - 12} more…
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder contents */}
      {structure?.structure && (
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-title">
              <span>◫</span> Contents
              {/* 📍 Показываем текущий путь, если не корень */}
              {currentPath && currentPath !== '.' && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                  ({currentPath})
                </span>
              )}
            </div>
          </div>
          <div className="info-card-body">
            {/* 🔙 Кнопка "Назад" */}
            {currentPath && currentPath !== '.' && (
              <div
                className="folder-item"
                onClick={() => onFolderClick(getParentPath(currentPath))}
                style={{ cursor: 'pointer', marginBottom: 12, background: 'var(--bg-secondary, #1a1a1a)', borderRadius: 8, padding: '8px 12px' }}
              >
                <span>⬆</span>
                <div className="folder-item-name" style={{ fontWeight: 500 }}>..</div>
              </div>
            )}

            {structure.structure.summary && (
              <div className="summary-text" style={{ marginBottom: 12 }}>
                {structure.structure.summary}
              </div>
            )}

            {/* Subfolders */}
            {structure.structure.subfolders.length > 0 && (
              <>
                <div className="nd-label" style={{ marginBottom: 8 }}>Folders</div>
                <div className="folder-grid">
                  {structure.structure.subfolders.map((folder, i) => (
                    <div key={i} className="folder-item" onClick={() => onFolderClick(folder.path)}>
                      <span>📁</span>
                      <div className="folder-item-name">{folder.path.split('/').pop()}</div>
                      <div className="folder-item-stats">
                        {folder.files.length}f · {folder.subfolders.length}d
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Python files */}
            {structure.structure.files.length > 0 && (
              <div style={{ marginTop: structure.structure.subfolders.length > 0 ? 14 : 0 }}>
                <div className="nd-label" style={{ marginBottom: 8 }}>Python Files</div>
                {structure.structure.files.map((file, i) => (
                  <div key={i} className="file-details-item">
                    <div className="file-details-path">
                      🐍 {file.file_path}
                    </div>
                    {file.classes.length > 0 && (
                      <>
                        <div className="chip-label">Classes</div>
                        <div className="chip-row">
                          {file.classes.map((cls, j) => (
                            <span key={j} className="chip chip-class">
                              {cls.name}
                              {cls.methods.length > 0 && (
                                <span style={{ opacity: .6, marginLeft: 4 }}>·{cls.methods.length}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {file.functions.length > 0 && (
                      <>
                        <div className="chip-label">Functions</div>
                        <div className="chip-row">
                          {file.functions.slice(0, 8).map((fn, j) => (
                            <span key={j} className="chip chip-fn">
                              {fn.name}()
                            </span>
                          ))}
                          {file.functions.length > 8 && (
                            <span className="chip chip-fn" style={{ opacity: .5 }}>
                              +{file.functions.length - 8}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {structure.structure.files.length === 0 && structure.structure.subfolders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted-2)', fontSize: 13 }}>
                This folder is empty
              </div>
            )}
          </div>
        </div>
      )}

      {/* README */}
      {structure?.readme && (
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-title">
              <span>📋</span> README
            </div>
          </div>
          <div className="info-card-body">
            <pre className="readme-pre">
              {structure.readme.slice(0, 1500)}
              {structure.readme.length > 1500 ? '\n…' : ''}
            </pre>
          </div>
        </div>
      )}

      {!summary && modules.length === 0 && !structure && (
        <div className="node-placeholder">
          <div className="node-placeholder-icon">⟳</div>
          <p>Loading overview…</p>
        </div>
      )}
    </div>
  );
};