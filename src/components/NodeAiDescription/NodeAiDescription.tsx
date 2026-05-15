import { useState, useEffect, useCallback } from 'react';

const descriptionCache = new Map<string, string>();

interface NodeAiDescriptionProps {
  repoId: string;
  nodePath: string;
  nodeType: 'file' | 'directory';
}

export const NodeAiDescription: React.FC<NodeAiDescriptionProps> = ({ repoId, nodePath, nodeType }) => {
  const cacheKey = `${repoId}:${nodePath}`;
  const [desc, setDesc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = descriptionCache.get(cacheKey);
    if (cached) {
      setDesc(cached);
    } else {
      setDesc(null);
    }
    setLoading(false);
    setError(null);
  }, [cacheKey]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/repos/${repoId}/describe-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_path: nodePath, node_type: nodeType })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Ошибка сервера');
      }
      const data = await res.json();

      descriptionCache.set(cacheKey, data.description);
      setDesc(data.description);
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать описание');
    } finally {
      setLoading(false);
    }
  }, [repoId, nodePath, nodeType, cacheKey]);

  if (desc) {
    return (
      <div style={{ marginTop: 12, paddingTop: 0 }}>
        <div style={{ background: '#21262d', padding: 12, borderRadius: 8, border: '1px solid #30363d' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💡 Назначение узла
          </div>
          <div style={{ fontSize: 14, color: '#e6edf3', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono', monospace" }}>
            {desc}
          </div>
          <button
            onClick={() => {
              descriptionCache.delete(cacheKey);
              setDesc(null);
            }}
            style={{
              marginTop: 10, fontSize: 12, fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#a371f7', background: 'rgba(163, 113, 247, 0.1)',
              border: '1px solid rgba(163, 113, 247, 0.3)', borderRadius: '6px',
              padding: '6px 10px', cursor: 'pointer', transition: 'all 0.2s ease',
              width: 'fit-content'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(163, 113, 247, 0.2)';
              e.currentTarget.style.color = '#d2a8ff';
              e.currentTarget.style.borderColor = '#a371f7';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(163, 113, 247, 0.1)';
              e.currentTarget.style.color = '#a371f7';
              e.currentTarget.style.borderColor = 'rgba(163, 113, 247, 0.3)';
            }}
          >
            ↺ Сбросить
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ marginTop: 12, color: '#8b949e', fontSize: 13, fontStyle: 'italic' }}>
        ⏳ Генерация описания...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 12, color: '#f85149', fontSize: 13, background: 'rgba(248, 81, 73, 0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(248, 81, 73, 0.2)' }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 0 }}>
      <button
        onClick={handleGenerate}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 500,
          fontFamily: "'JetBrains Mono', monospace",
          background: 'linear-gradient(135deg, #6e41e2, #9b71f7)',
          color: '#fff', border: '1px solid #a371f7', borderRadius: '8px',
          cursor: 'pointer', transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(163, 113, 247, 0.15)'
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(163, 113, 247, 0.25)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #5a32c7, #8b61e7)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(163, 113, 247, 0.15)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #6e41e2, #9b71f7)';
        }}
      >
        <span></span> Сгенерировать описание
      </button>
    </div>
  );
};