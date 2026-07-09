import { Bot, ChevronDown, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '../services/api';

const suggestions = [
  'Where did I spend the most in the last 3 months?',
  'Compare this month with last month',
  'How are my card budgets this month?',
  'Which categories are over budget?',
];

const welcomeMessage = {
  role: 'assistant',
  content: 'Ask me about expenses, card budgets, balances, recoveries, or month comparisons. I will calculate from your Dhanam data.',
};

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [open, messages]);

  const ask = async (text = input) => {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages
        .filter((message) => ['user', 'assistant'].includes(message.role))
        .slice(-8);
      const { data } = await chatApi.ask({ message: question, history });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.answer,
          toolsUsed: data.toolsUsed || [],
          generatedAt: data.generatedAt,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err.response?.data?.error || err.message || 'I could not analyze that right now.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask();
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:bg-indigo-800"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Ask Dhanam</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:right-5 sm:bottom-5 sm:w-[420px]">
          <div className="flex h-[86vh] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-[640px] sm:max-h-[calc(100vh-48px)] sm:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Bot size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">Dhanam Assistant</p>
                <p className="truncate text-xs text-slate-400">Read-only answers from your finance data</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:block"
                title="Close"
              >
                <X size={18} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:hidden"
                title="Minimize"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-3 py-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'max-w-[88%] rounded-br-md bg-indigo-600 text-white'
                        : message.isError
                          ? 'max-w-[92%] rounded-bl-md border border-rose-100 bg-rose-50 text-rose-700'
                          : 'max-w-[96%] rounded-bl-md border border-slate-100 bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="chat-markdown">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {message.toolsUsed?.length > 0 && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Sparkles size={11} />
                        Checked {message.toolsUsed.map((tool) => tool.replaceAll('_', ' ')).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-3 text-sm text-slate-500 shadow-sm">
                    <Loader2 size={15} className="animate-spin text-indigo-500" />
                    Calculating from your data...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white p-3">
              {messages.length <= 1 && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => ask(suggestion)}
                      className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      ask();
                    }
                  }}
                  rows={1}
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ask about your finances..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                  title="Send"
                >
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
