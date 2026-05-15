import { useState, useEffect } from 'react';

interface NodeAiDescriptionProps {
  repoId: string;
  nodePath: string;
  nodeType: 'file' | 'directory';
}

export const NodeAiDescription: React.FC<NodeAiDescriptionProps> = ({ repoId, nodePath, nodeType }) => {
  const [desc, setDesc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 АВТОМАТИЧЕСКИЙ СБРОС при выборе другого файла/папки
  useEffect(() => {
    setDesc(null);
    setLoading(false);
    setError(null);
  }, [nodePath, nodeType]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setDesc(null);
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
      setDesc(data.description);
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать описание');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
        ⏳ Генерация описания...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 12, color: '#ef4444', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
      {!desc ? (
        <button
          onClick={handleGenerate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', fontSize: 13, fontWeight: 500,
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseOut={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          Сгенерировать описание
        </button>
      ) : (
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💡 Назначение узла
          </div>
          <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {desc}
          </div>
          <button
            onClick={() => setDesc(null)}
            style={{ marginTop: 8, fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Сбросить / Перегенерировать
          </button>
        </div>
      )}
    </div>
  );
};