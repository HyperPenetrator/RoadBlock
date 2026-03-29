import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Map, Settings, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';

function haptic() { if ('vibrate' in navigator) navigator.vibrate(15); }

const ITEMS = [
  { icon: LayoutDashboard, label: 'Overview', path: '/', color: '#00FFD1' },
  { icon: Map,             label: 'Navigator', path: '/map', color: '#00D1FF' },
  { icon: Clock,           label: 'History',   path: null,  color: '#EAB308' },
  { icon: Settings,        label: 'Settings',  path: '/settings', color: 'rgba(255,255,255,0.5)' },
] as const;

export const GhostSidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setSidebarOpen } = useUIStore();

  const toggle = () => {
    setExpanded((v) => !v);
    setSidebarOpen(!expanded);
    haptic();
  };

  const handleNav = (path: string | null) => {
    if (!path) return;
    setExpanded(false);
    setSidebarOpen(false);
    navigate(path);
    haptic();
  };

  return (
    <motion.div
      animate={{ width: expanded ? 168 : 40 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className="fixed left-0 z-30 overflow-hidden"
      style={{
        top: '32%',
        borderRadius: '0 20px 20px 0',
        background: 'rgba(6, 8, 16, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        borderLeft: '2px solid rgba(0,255,209,0.35)',
        boxShadow: '2px 0 32px rgba(0,255,209,0.06), inset 1px 0 0 rgba(0,255,209,0.04)',
      }}
    >
      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 4px)' }} />

      {/* Items */}
      <div className="relative z-10 flex flex-col py-2">
        {ITEMS.map(({ icon: Icon, label, path, color }) => {
          const isActive = path === pathname;
          return (
            <button
              key={label}
              onClick={expanded ? () => handleNav(path) : toggle}
              aria-label={label}
              className="flex items-center gap-3 px-3 py-3.5 transition-all active:scale-95"
              style={{ background: isActive ? 'rgba(0,255,209,0.07)' : 'transparent' }}
            >
              <Icon
                style={{
                  width: 17, height: 17, color: isActive ? '#00FFD1' : color,
                  flexShrink: 0,
                  filter: isActive ? 'drop-shadow(0 0 6px #00FFD1)' : 'none',
                }}
              />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.14 }}
                    className="font-mono text-[10px] font-bold tracking-[0.28em] uppercase whitespace-nowrap"
                    style={{ color: isActive ? '#00FFD1' : 'rgba(255,255,255,0.45)' }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Collapse handle when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={toggle}
            className="relative z-10 w-full flex justify-center py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            aria-label="Collapse sidebar"
          >
            <div className="w-6 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
