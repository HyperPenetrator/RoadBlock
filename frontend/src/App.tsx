import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/globals.css';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import { MissionOnboarding } from './components/MissionOnboarding';
import { ShieldAlert } from 'lucide-react';
import { usePermissionStore } from './store/usePermissionStore';
import { GhostSidebar } from './components/GhostSidebar';

const Settings = () => {
  const { resetPermissions } = usePermissionStore();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
      className="relative w-screen h-[100svh] bg-[#04060A] text-white overflow-hidden select-none flex items-center justify-center font-[Inter,sans-serif]"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-md w-full mx-auto p-8 relative z-10">
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-[#E63946] blur-[40px] opacity-20 rounded-full" />
          <div className="p-5 rounded-[40px] relative" style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)' }}>
            <ShieldAlert className="w-12 h-12 text-[#E63946]" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Neural <span className="text-[#E63946]">Config</span></h2>
          <p className="text-white/40 mt-3 font-mono uppercase tracking-widest text-[10px]">Adjust tactical integration parameters</p>
        </div>
        
        <div className="p-6 rounded-3xl" style={{ background: 'rgba(10,12,22,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-[#00D1FF] uppercase mb-1">Onboarding State</p>
              <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest">Active mission protocols</p>
            </div>
            <button 
              onClick={() => { resetPermissions(); window.location.href = '/'; }}
              className="px-5 py-2.5 font-mono text-[10px] uppercase font-bold tracking-[0.25em] transition-all rounded-xl active:scale-95 text-white"
              style={{ background: 'linear-gradient(135deg,#E63946,#C1121F)', boxShadow: '0 4px 20px rgba(230,57,70,0.45)' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <Dashboard />
          </motion.div>
        } />
        <Route path="/map" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <MapView />
          </motion.div>
        } />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  const { isOnboarded, checkPermissions } = usePermissionStore();

  useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <Router>
      {!isOnboarded && <MissionOnboarding />}
      <GhostSidebar />
      <AnimatedRoutes />
    </Router>
  );
}
