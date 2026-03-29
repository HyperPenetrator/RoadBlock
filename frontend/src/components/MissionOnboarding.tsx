import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, ChevronRight, Satellite } from 'lucide-react';
import { usePermissionStore } from '../store/usePermissionStore';
import { Capacitor } from '@capacitor/core';

export const MissionOnboarding: React.FC = () => {
    const { requestGeolocation, requestWakeLock, completeOnboarding } = usePermissionStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNext = async () => {
        setLoading(true);
        setError(null);
        try {
            if (step === 1) {
                const geoSuccess = await requestGeolocation();
                if (!geoSuccess) {
                    setError('Satellite Link Denied. Manual override required.');
                    setLoading(false);
                    return;
                }
                setStep(2);
            } else if (step === 2) {
                await requestWakeLock();
                completeOnboarding();
            }
        } catch (e) {
            setError('System Integration Error: Link failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#04060A]/80 backdrop-blur-3xl font-[Inter,sans-serif]">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full rounded-[48px] p-10 relative overflow-hidden"
                style={{ background: 'rgba(10,12,22,0.92)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            >
                {/* Visual Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#E63946]/20 blur-[100px] -mr-24 -mt-24 pointer-events-none" />
                
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div 
                            key="step1"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="space-y-8 relative z-10"
                        >
                            <div className="p-4 rounded-3xl w-fit text-[#E63946]" style={{ background: 'rgba(230,57,70,0.1)' }}>
                                <Satellite className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Neural Sync <span className="text-[#E63946]">GPS</span></h1>
                                <p className="text-[11px] font-mono text-white/40 leading-relaxed uppercase tracking-wider">
                                    RoadFireWall requires real-time geospatial data to provide terrain-optimized safety suggestions.
                                </p>
                            </div>
                            
                            <div className="p-5 rounded-3xl space-y-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-black/40 rounded-xl shadow-sm"><ShieldAlert className="w-5 h-5 text-[#E63946]" /></div>
                                    <p className="text-xs font-mono font-bold text-white/60">Your location is encrypted and never shared. Data is local to this mission instance.</p>
                                </div>
                            </div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="p-5 border rounded-3xl space-y-3"
                                    style={{ background: 'rgba(230,57,70,0.1)', borderColor: 'rgba(230,57,70,0.2)' }}
                                >
                                    <p className="text-xs font-black text-[#E63946] uppercase tracking-widest text-center">{error}</p>
                                    <ul className="space-y-2.5 mt-2">
                                        <li className="flex items-start gap-3 text-[10px] font-mono font-bold text-[#E63946]/70 uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#E63946] mt-1" />
                                            {Capacitor.isNativePlatform() ? 'App Settings > Permissions > Location' : 'Tap Browser Lock Icon > Allow Location'}
                                        </li>
                                    </ul>
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                <button 
                                    onClick={handleNext}
                                    disabled={loading}
                                    className="w-full py-5 text-white font-black rounded-[24px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                    style={{ background: 'linear-gradient(135deg,#E63946,#C1121F)', boxShadow: '0 4px 20px rgba(230,57,70,0.45)' }}
                                >
                                    {loading ? 'BYPASSING FIREWALL...' : error ? 'RE-ATTEMPT SYNC' : 'AUTHORIZE SATELLITE'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                
                                {error && (
                                    <button onClick={() => setStep(2)} className="w-full text-center text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white/60">
                                        Proceed Offline
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="step2"
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                            className="space-y-8 relative z-10"
                        >
                            <div className="p-4 rounded-3xl w-fit text-[#00D1FF]" style={{ background: 'rgba(0,209,255,0.1)' }}>
                                <Zap className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Power <span className="text-[#00D1FF]">Continuity</span></h1>
                                <p className="text-[11px] font-mono text-white/40 leading-relaxed uppercase tracking-wider">
                                    Engage Screen Wake Lock to keep the tactical grid active throughout your journey.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button 
                                    onClick={handleNext}
                                    disabled={loading}
                                    className="w-full py-5 text-white font-black rounded-[24px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                    style={{ background: 'linear-gradient(135deg,#00D1FF,#009BFF)', boxShadow: '0 4px 20px rgba(0,209,255,0.3)' }}
                                >
                                    {loading ? 'CALIBRATING...' : 'ENGAGE WAKE LOCK'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button onClick={completeOnboarding} className="w-full text-center text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white/60">
                                    Skip & Finalize
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
