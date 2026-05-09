import React, { useState } from 'react';
import type { AskResponse } from '../../api/types';
import './QAPanel.module.css';

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
    <div className="qa-panel">
      <div className="qa-header">
        <h3>💬 Ask about codebase</h3>
        <span className="badge">MVP</span>
      </div>
      
      <div className="qa-info">
        <p>
          ⚠️ <strong>MVP version</strong> — answers are based on file name heuristics.
          Full LLM integration coming soon.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="qa-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., How does the upload work?"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? '⏳' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div className="qa-answer">
          <div className="answer-question">
            <strong>Q:</strong> {answer.question}
          </div>
          <div className="answer-content">
            <strong>A:</strong>
            <p>{answer.answer}</p>
          </div>
          {answer.sources.length > 0 && (
            <div className="answer-sources">
              <strong>📄 Relevant files:</strong>
              <ul>
                {answer.sources.map((source, i) => (
                  <li key={i}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!answer && !isLoading && (
        <div className="qa-placeholder">
          <p>Ask a question about this codebase to get started.</p>
          <p className="examples">
            Examples:<br />
            • What does this project do?<br />
            • How to run the application?<br />
            • What are the main components?
          </p>
        </div>
      )}
    </div>
  );
};