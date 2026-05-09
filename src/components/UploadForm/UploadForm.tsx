import React, { useCallback, useState } from 'react';
import { reposApi } from '../../api/repos';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_UPLOAD_SIZE_MB = 50;

interface UploadFormProps {
  onUploadSuccess: (repoId: string) => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return 'Only .zip files are supported';
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `File too large. Maximum size: ${MAX_UPLOAD_SIZE_MB} MB`;
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedFile(file);

    try {
      const result = await reposApi.upload(file);
      onUploadSuccess(result.repo_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, []);

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h1>Codebase Explorer</h1>
        <p>Upload a ZIP file to analyze your codebase</p>

        <div 
          className={`drop-zone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            disabled={loading}
            id="file-input"
          />
          <label htmlFor="file-input">
            <div className="upload-icon">📦</div>
            <p>Drag & drop a ZIP file here, or click to select</p>
            {selectedFile && !loading && (
              <p className="selected">{selectedFile.name}</p>
            )}
          </label>
        </div>

        <button 
          className="button-upload"
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Upload Repository'}
        </button>

        <p className="hint">Maximum size: {MAX_UPLOAD_SIZE_MB} MB</p>

        {error && <div className="error">{error}</div>}

        <div className="info">
          <h3>What happens after upload?</h3>
          <ul>
            <li>Repository structure is analyzed</li>
            <li>Python files are parsed (classes, functions, docstrings)</li>
            <li>README files are extracted</li>
            <li>You can ask questions about the codebase</li>
          </ul>
        </div>
      </div>
    </div>
  );
};