interface FolderSummaryProps {
  folderName: string;
  folderPath?: string;
  fileCount: number;
  subfolderCount: number;
  description?: string;
  onFolderClick?: (path: string) => void;
}

export const FolderSummary: React.FC<FolderSummaryProps> = ({ 
  folderName, 
  folderPath = '',
  fileCount, 
  subfolderCount, 
  description,
  onFolderClick 
}) => {
  const handleClick = () => {
    if (onFolderClick && folderPath) {
      onFolderClick(folderPath);
    }
  };

  return (
    <div 
      className="folder-summary"
      onClick={handleClick}
      style={{ 
        cursor: onFolderClick ? 'pointer' : 'default',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>📁</span>
        <h3 style={{ margin: 0 }}>{folderName}</h3>
      </div>
      <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>
        {description || `Contains ${fileCount} file(s) and ${subfolderCount} subfolder(s).`}
      </p>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
        <span>📄 {fileCount} files</span>
        <span>📁 {subfolderCount} subfolders</span>
      </div>
    </div>
  );
};