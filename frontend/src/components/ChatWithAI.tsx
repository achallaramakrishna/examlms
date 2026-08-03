import { FormEvent, useState } from 'react';
import { askDoubt } from '../services/chatAPI';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatWithAIProps {
  examId?: string;
  subjectId?: string;
}

export function ChatWithAI({ examId, subjectId }: ChatWithAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const { answer } = await askDoubt(question, { examId, subjectId });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong answering that.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-with-ai">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <p key={i} className={`chat-message chat-message--${m.role}`}>
            {m.content}
          </p>
        ))}
        {loading && <p className="chat-message chat-message--assistant">Thinking...</p>}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a doubt about this topic..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
