import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function ChatMessage({ message, isUser, isAnimated, onAnimationEnd, onCopy }) {
  const [displayed, setDisplayed] = useState(isAnimated ? '' : message);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef();

  useEffect(() => {
    if (!isAnimated) return;
    let i = 0;
    intervalRef.current = setInterval(() => {
      setDisplayed(message.slice(0, i + 1));
      i++;
      if (i >= message.length) {
        clearInterval(intervalRef.current);
        if (onAnimationEnd) onAnimationEnd();
      }
    }, 16); // ~60 chars/sec
    return () => clearInterval(intervalRef.current);
  }, [isAnimated, message, onAnimationEnd]);

  const handleCopy = () => {
    if (onCopy) onCopy();
    navigator.clipboard.writeText(
      displayed.replace(/<[^>]+>/g, '') // strip HTML tags
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={isUser ? 'chat-message user' : 'chat-message bot'}>
      {!isUser && <span className="chat-avatar" role="img" aria-label="Kelvin">🧑‍🔬</span>}
      <div dangerouslySetInnerHTML={{ __html: displayed }} />
      <button className="chat-copy" onClick={handleCopy} title="Copy message">
        {copied ? '✅' : '📋'}
      </button>
    </div>
  );
}

const PATTERNS = [
  // Wave
  `url('data:image/svg+xml;utf8,<svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 30 Q 30 60 60 30 T 120 30" stroke="%2355d6be" stroke-width="2" fill="none"/><path d="M0 40 Q 30 70 60 40 T 120 40" stroke="%23e0c3fc" stroke-width="1.5" fill="none"/></svg>')`,
  // Dots
  `url('data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="2" fill="%2355d6be"/><circle cx="30" cy="30" r="2" fill="%23e0c3fc"/><circle cx="30" cy="10" r="2" fill="%2355d6be"/><circle cx="10" cy="30" r="2" fill="%23e0c3fc"/></svg>')`,
  // Diagonal lines
  `url('data:image/svg+xml;utf8,<svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 60L60 0M-10 50L50 -10M10 70L70 10" stroke="%2355d6be" stroke-width="2"/></svg>')`,
  // Grid
  `url('data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="40" height="40" fill="none"/><path d="M0 20h40M20 0v40" stroke="%23e0c3fc" stroke-width="1.5"/></svg>')`,
  // Abstract blobs
  `url('data:image/svg+xml;utf8,<svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="30" rx="16" ry="8" fill="%2355d6be" fill-opacity="0.2"/><ellipse cx="60" cy="30" rx="16" ry="8" fill="%23e0c3fc" fill-opacity="0.2"/></svg>')`,
];

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('kelvin_chat_history');
    return saved
      ? JSON.parse(saved)
      : [{ role: 'assistant', content: 'Hello! I\'m <b>Kelvin</b>, your AI assistant. How can I help you today?' }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [animatingIdx, setAnimatingIdx] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('kelvin_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, animatingIdx]);

  useEffect(() => {
    let idx = Math.floor(Math.random() * PATTERNS.length);
    function setPattern(i) {
      document.body.style.setProperty('--pattern-bg', PATTERNS[i]);
    }
    setPattern(idx);
    const interval = setInterval(() => {
      idx = (idx + 1) % PATTERNS.length;
      setPattern(idx);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function renderMarkdown(text) {
    // Simple markdown/code formatting (for demo)
    return text
      .replace(/\n/g, '<br/>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>');
  }

  const handleSend = async () => {
    if (!input.trim()) return;
    setError(null);
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('https://kcb-sitn.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // or your preferred model
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        setAnimatingIdx(newMessages.length);
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.choices[0].message.content }
        ]);
      } else {
        setError('No response from assistant.');
      }
    } catch (err) {
      setError('Error connecting to backend.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('text/')) {
      setError('Only text files are supported.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setInput(`Here is the content of the file '${file.name}':\n\n${content}`);
    };
    reader.readAsText(file);
  };

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: 'Hello! I\'m <b>Kelvin</b>, your AI assistant. How can I help you today?' }]);
    setError(null);
    setInput('');
  };

  const handleExport = () => {
    const md = messages.map(m =>
      m.role === 'user'
        ? `**You:** ${m.content.replace(/\n/g, '  \n')}`
        : `**Kelvin:** ${m.content.replace(/\n/g, '  \n')}`
    ).join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kelvin-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="chat-header-title">
          <span role="img" aria-label="robot">🤖</span> Kelvin
        </div>
        <button className="theme-toggle" onClick={handleThemeToggle}>
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <button className="chat-clear" onClick={handleClearChat} title="Clear chat">
          🗑️
        </button>
        <button className="chat-export" onClick={handleExport} title="Export conversation">
          ⬇️
        </button>
      </header>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            message={renderMarkdown(msg.content)}
            isUser={msg.role === 'user'}
            isAnimated={msg.role === 'assistant' && idx === animatingIdx}
            onAnimationEnd={() => setAnimatingIdx(null)}
            onCopy={() => {}}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {error && <div className="chat-error">{error}</div>}
      <div className="chat-input-row">
        <input
          type="file"
          accept=".txt,.md,.csv,.json,.log,.xml,.yaml,.yml"
          className="chat-file-input"
          onChange={handleFileUpload}
          disabled={loading}
        />
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows={2}
          disabled={loading}
        />
        <button className="chat-send" onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App;
