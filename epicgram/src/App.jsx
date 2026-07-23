import { useMemo, useState } from 'react';
import './styles.css';

const initialAgents = [
  {
    id: 'news-agent',
    name: 'News Agent',
    role: 'Новостной канал',
    model: 'GPT-4o / Ollama fallback',
    status: 'offline',
    postsToday: 0,
    lastLog: 'Ожидает подключения runtime-agent',
  },
  {
    id: 'browser-agent',
    name: 'Browser Operator',
    role: 'Браузер и сайты',
    model: 'Playwright',
    status: 'offline',
    postsToday: 0,
    lastLog: 'Playwright tool не подключён',
  },
  {
    id: 'obs-agent',
    name: 'OBS Operator',
    role: 'Стримы и запись',
    model: 'OBS WebSocket',
    status: 'offline',
    postsToday: 0,
    lastLog: 'OBS WebSocket не подключён',
  },
];

const quickCommands = [
  'Запусти всіх',
  'Покажи логи агента 1',
  'Вимкни autopost',
  'Пост зараз',
  'Проверь runtime',
  'Сделай скрин ноутбука',
];

export default function App() {
  const [tab, setTab] = useState('agents');
  const [agents, setAgents] = useState(initialAgents);
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'ai',
      text: 'Привет! Я AI-копілот 🤖\nЯ можу керувати агентами за твоєю командою.\n\nСпробуй: «Запусти всіх», «Покажи логи агента 1», «Вимкни autopost»',
    },
  ]);
  const [system] = useState({
    runtime: 'offline',
    api: import.meta.env.VITE_API_URL || 'not configured',
    telegram: window?.Telegram?.WebApp ? 'connected' : 'browser mode',
    websocket: 'not connected',
  });

  const stats = useMemo(() => {
    const online = agents.filter((agent) => agent.status === 'online').length;
    const posts = agents.reduce((sum, agent) => sum + agent.postsToday, 0);
    return { total: agents.length, online, posts };
  }, [agents]);

  function sendCommand(rawCommand = command) {
    const value = rawCommand.trim();
    if (!value) return;

    setMessages((current) => [...current, { from: 'user', text: value }]);
    setCommand('');

    const lower = value.toLowerCase();

    if (lower.includes('запусти')) {
      setAgents((list) =>
        list.map((agent) => ({
          ...agent,
          status: 'online',
          lastLog: 'Запущен в demo-mode. Runtime пока не подключён.',
        })),
      );
      setMessages((current) => [
        ...current,
        {
          from: 'ai',
          text: 'Запускаю всех агентов в demo-mode. Для реальных действий нужно подключить local runtime-agent.',
        },
      ]);
      return;
    }

    if (lower.includes('зупини') || lower.includes('останов') || lower.includes('вимкни')) {
      setAgents((list) =>
        list.map((agent) => ({
          ...agent,
          status: 'offline',
          lastLog: 'Остановлен через AI Copilot.',
        })),
      );
      setMessages((current) => [
        ...current,
        {
          from: 'ai',
          text: 'Остановила агентов в панели. Реальная остановка будет работать после подключения backend/runtime.',
        },
      ]);
      return;
    }

    if (lower.includes('лог')) {
      const logs = agents.map((agent, index) => `${index + 1}. ${agent.name}: ${agent.lastLog}`).join('\n');
      setMessages((current) => [...current, { from: 'ai', text: logs }]);
      return;
    }

    if (lower.includes('пост')) {
      setAgents((list) =>
        list.map((agent) =>
          agent.id === 'news-agent'
            ? {
                ...agent,
                postsToday: agent.postsToday + 1,
                lastLog: 'Создан demo-пост. Реальный постинг требует Telegram Bot API.',
              }
            : agent,
        ),
      );
      setMessages((current) => [
        ...current,
        {
          from: 'ai',
          text: 'Demo-пост засчитан. Следующий шаг — подключить Telegram Bot API и backend endpoint /post-now.',
        },
      ]);
      return;
    }

    if (lower.includes('runtime')) {
      setMessages((current) => [
        ...current,
        {
          from: 'ai',
          text: `Runtime: ${system.runtime}\nAPI: ${system.api}\nWebSocket: ${system.websocket}`,
        },
      ]);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        from: 'ai',
        text: 'Команду приняла. Сейчас это demo-режим UI. Для выполнения на ноуте нужен local runtime-agent.',
      },
    ]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">⚡</div>
        <div>
          <h1>Agent Control Center</h1>
          <div className="status-line"><span className="pulse" /> {stats.online} ONLINE</div>
        </div>
      </header>

      <main className="content">
        <PetProjectBanner />
        {tab === 'agents' && <AgentsView agents={agents} stats={stats} setAgents={setAgents} />}
        {tab === 'ai' && <CopilotView messages={messages} command={command} setCommand={setCommand} sendCommand={sendCommand} />}
        {tab === 'stats' && <StatsView agents={agents} stats={stats} />}
        {tab === 'system' && <SystemView system={system} quickCommands={quickCommands} sendCommand={sendCommand} />}
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'agents' ? 'active' : ''} onClick={() => setTab('agents')}><span>⚡</span>АГЕНТИ</button>
        <button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}><span>🤖</span>AI</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}><span>📊</span>СТАТИСТИКА</button>
        <button className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}><span>⚙️</span>СИСТЕМА</button>
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ненавязчивый промо-баннер пет-проекта EPIC☠STAR (мини-апп / сайт).
// Только UI + ссылки. Никаких авто-рассылок и фоновых запросов. Закрывается и
// запоминает выбор в localStorage. Ссылки настраиваются через VITE_EPICSTAR_*.
// ─────────────────────────────────────────────────────────────────────────────
const EPICSTAR_SITE = import.meta.env.VITE_EPICSTAR_URL || 'https://epicstar.fun';
const EPICSTAR_BOT = import.meta.env.VITE_EPICSTAR_BOT || 'EpicStarBot';
const EPICSTAR_TG = `https://t.me/${EPICSTAR_BOT}?startapp=epicgram`;

function PetProjectBanner() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('epicstar_promo_dismissed') === '1'; } catch { return false; }
  });
  if (hidden) return null;
  function dismiss() {
    try { localStorage.setItem('epicstar_promo_dismissed', '1'); } catch { /* ignore */ }
    setHidden(true);
  }
  return (
    <div className="pet-banner" role="complementary" aria-label="EPIC STAR promo">
      <span className="pet-banner__icon">⭐</span>
      <div className="pet-banner__copy">
        <strong>EPIC☠STAR — приложение / мини-апп</strong>
        <span>Дерзкий AI-компаньон и тапер. Открой в Telegram или на сайте.</span>
      </div>
      <div className="pet-banner__cta">
        <a className="pet-banner__btn primary" href={EPICSTAR_TG} target="_blank" rel="noopener noreferrer">Открыть мини-апп</a>
        <a className="pet-banner__btn" href={EPICSTAR_SITE} target="_blank" rel="noopener noreferrer">epicstar.fun</a>
      </div>
      <button className="pet-banner__close" onClick={dismiss} aria-label="Скрыть">×</button>
    </div>
  );
}

function StatCard({ value, label, tone }) {
  return <div className={`stat-card ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function AgentsView({ agents, stats, setAgents }) {
  return (
    <section>
      <div className="stats-grid">
        <StatCard value={stats.total} label="АГЕНТІВ" tone="blue" />
        <StatCard value={stats.online} label="ОНЛАЙН" tone="green" />
        <StatCard value={stats.posts} label="ПОСТІВ/ДЕНЬ" tone="gold" />
      </div>

      <div className="section-head">
        <h2>АГЕНТИ</h2>
        <button className="outline-btn" onClick={() => setAgents((list) => [...list, {
          id: `custom-${Date.now()}`,
          name: 'Custom Agent',
          role: 'Новый агент',
          model: 'Not configured',
          status: 'offline',
          postsToday: 0,
          lastLog: 'Создан через UI',
        }])}>+ Додати</button>
      </div>

      <div className="agent-list">
        {agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
      </div>
    </section>
  );
}

function AgentCard({ agent }) {
  return (
    <article className="agent-card">
      <div>
        <h3>{agent.name}</h3>
        <p>{agent.role}</p>
        <small>{agent.model}</small>
      </div>
      <span className={`badge ${agent.status}`}>{agent.status.toUpperCase()}</span>
    </article>
  );
}

function CopilotView({ messages, command, setCommand, sendCommand }) {
  return (
    <section className="copilot-view">
      <div className="copilot-card">
        <div className="robot">🤖</div>
        <div>
          <h2>AI Copilot</h2>
          <p>GPT-4o · локальный runtime pending</p>
        </div>
        <span className="active-dot">ACTIVE</span>
      </div>

      <div className="quick-actions">
        <button onClick={() => sendCommand('Запусти всіх')}>🚀 Запусти всіх</button>
        <button onClick={() => sendCommand('Зупини всіх')}>⏹️ Зупини всіх</button>
        <button onClick={() => sendCommand('Пост зараз')}>📤 Пост зараз</button>
      </div>

      <div className="chat-box">
        {messages.map((msg, index) => <div key={`${msg.from}-${index}`} className={`message ${msg.from}`}>{msg.text}</div>)}
      </div>

      <div className="command-box">
        <input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendCommand()} placeholder="Запусти агент 1, покажи логи..." />
        <button onClick={() => sendCommand()}>➤</button>
      </div>
    </section>
  );
}

function StatsView({ agents, stats }) {
  return (
    <section>
      <div className="stats-grid">
        <StatCard value={stats.total} label="TOTAL" tone="blue" />
        <StatCard value={stats.online} label="ONLINE" tone="green" />
        <StatCard value={stats.posts} label="POSTS" tone="gold" />
      </div>
      <div className="panel">
        <h2>Agent Activity</h2>
        {agents.map((agent) => <div className="row" key={agent.id}><span>{agent.name}</span><strong>{agent.postsToday}</strong></div>)}
      </div>
    </section>
  );
}

function SystemView({ system, quickCommands, sendCommand }) {
  return (
    <section>
      <div className="panel">
        <h2>System Status</h2>
        {Object.entries(system).map(([key, value]) => <div className="row" key={key}><span>{key}</span><strong>{value}</strong></div>)}
      </div>
      <div className="panel">
        <h2>Quick Commands</h2>
        <div className="chips">
          {quickCommands.map((cmd) => <button key={cmd} onClick={() => sendCommand(cmd)}>{cmd}</button>)}
        </div>
      </div>
    </section>
  );
}
