import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/market',    ico: '📈', label: 'Market'    },
  { path: '/watchlist', ico: '⭐', label: 'Watchlist' },
  { path: '/portfolio', ico: '💼', label: 'Portfolio' },
  { path: '/settings',  ico: '⚙️', label: 'Settings'  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bnav">
      {tabs.map(t => (
        <button
          key={t.path}
          className={`bni ${pathname.startsWith(t.path) ? 'active' : ''}`}
          onClick={() => navigate(t.path)}
        >
          <span className="bni-ico">{t.ico}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
