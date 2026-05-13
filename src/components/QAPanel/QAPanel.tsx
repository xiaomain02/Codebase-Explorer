import React, { useState } from 'react';
import type { AskResponse } from '../../api/types';

interface QAPanelProps {
  onAsk: (question: string) => Promise<AskResponse>;
  answer: AskResponse | null;
  loading: boolean;
}

export const QAPanel: React.FC<QAPanelProps> = ({ onAsk, answer, loading }) => {
  const [question, setQuestion] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || localLoading) return;
    setLocalLoading(true);
    try {
      await onAsk(question);
      setQuestion('');
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div className="qa-section">
      <div className="qa-mvp-note">
        ⚠ <span><strong>MVP mode</strong> — answers use filename heuristics. Full LLM integration coming soon.</span>
      </div>

      <form onSubmit={handleSubmit} className="qa-input-row">
        <input
          className="qa-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How does upload work?"
          disabled={isLoading}
        />
        <button className="qa-btn" type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? '…' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div className="qa-answer">
          <div className="qa-answer-q">
            <strong>Q</strong>
            {answer.question}
          </div>
          <div className="qa-answer-body">{answer.answer}</div>
          {answer.sources.length > 0 && (
            <div className="qa-sources">
              <div className="qa-sources-label">Relevant files</div>
              <div>
                {answer.sources.map((src, i) => (
                  <span key={i} className="qa-source-chip">{src}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!answer && !isLoading && (
        <div className="qa-placeholder">
          Ask a question about this codebase.
          <div className="qa-examples">
            {'> What does this project do?\n> How to run the application?\n> What are the main components?'}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="qa-placeholder loading-pulse">
          Searching codebase…
        </div>
      )}
    </div>
  );
};
