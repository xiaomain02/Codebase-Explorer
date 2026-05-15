import React, { useState } from 'react';

export interface QAItem {
  question: string;
  answer: string;
  sources: string[];
  collapsed: boolean;
}

interface QAPanelProps {
  onAsk: (question: string) => Promise<any>;
  history: QAItem[];
  onToggle: (idx: number) => void;
  onClear: () => void;
  loading: boolean;
}

export const QAPanel: React.FC<QAPanelProps> = ({ onAsk, history, onToggle, onClear, loading }) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || localLoading) return;
    const q = question;
    setQuestion('');
    setLocalLoading(true);
    try {
      await onAsk(q);
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div className="qa-section">
      <form onSubmit={handleSubmit} className="qa-input-row">
        <input
          className="qa-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Задай вопрос о проекте…"
          disabled={isLoading}
        />
        <button className="qa-btn" type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? '…' : 'Ask'}
        </button>
      </form>

      {isLoading && (
        <div className="qa-placeholder loading-pulse">
          Анализирую проект…
        </div>
      )}

      {history.length === 0 && !isLoading && (
        <div className="qa-placeholder">
          Задай вопрос — LLM проанализирует структуру проекта и ответит.
          <div className="qa-examples">
            {'> Что делает этот проект?\n> Как запустить приложение?\n> Какие основные компоненты?'}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="qa-history">
          <div className="qa-history-header">
            <span className="qa-history-count">
              {history.length} {history.length === 1 ? 'вопрос' : history.length < 5 ? 'вопроса' : 'вопросов'}
            </span>
            <button className="qa-clear-btn" onClick={onClear}>Очистить</button>
          </div>

          {history.map((item, idx) => (
            <div key={idx} className={`qa-answer qa-history-item${item.collapsed ? ' collapsed' : ''}`}>
              <div className="qa-answer-q qa-history-toggle" onClick={() => onToggle(idx)}>
                <strong>Q</strong>
                <span className="qa-q-text">{item.question}</span>
                <span className="qa-collapse-icon">{item.collapsed ? '▸' : '▾'}</span>
              </div>

              {!item.collapsed && (
                <>
                  <div className="qa-answer-body">{item.answer}</div>
                  {item.sources.length > 0 && (
                    <div className="qa-sources">
                      <div className="qa-sources-label">Relevant files</div>
                      <div>
                        {item.sources.map((src, i) => (
                          <span key={i} className="qa-source-chip">{src}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
