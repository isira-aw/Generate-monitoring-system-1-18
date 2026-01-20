'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion ,Variants, easeOut} from 'framer-motion';
import { gsap } from 'gsap';
import { 
  Activity, Cpu, Phone, Layers, ChevronRight, 
  Globe,
  ArrowRight,
  PlaneIcon,
  ShieldCheck
} from 'lucide-react';
import { Zap, Twitter, Github, Linkedin, Mail } from "lucide-react";
import Link from 'next/link';

// Animation variants for 3D-like feel

const stagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 24,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};


// --- TYPES ---
interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _active: boolean;
}

// --- FULL PAGE BACKGROUND DOT GRID ---
const GlobalDotGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef({ x: 0, y: 0 });

  const config = {
    dotSize: 5,
    gap: 30, // Increased gap for a cleaner look
    baseColor: "#475083",
    activeColor: "#dbdce6",
    proximity: 120,
    returnDuration: 1.2
  };

  const hexToRgb = (hex: string) => {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  };

  const baseRgb = useMemo(() => hexToRgb(config.baseColor), [config.baseColor]);
  const activeRgb = useMemo(() => hexToRgb(config.activeColor), [config.activeColor]);

  const buildGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor(width / config.gap);
    const rows = Math.floor(height / config.gap);

    const dots: Dot[] = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        dots.push({ 
          cx: x * config.gap, 
          cy: y * config.gap, 
          xOffset: 0, 
          yOffset: 0, 
          _active: false 
        });
      }
    }
    dotsRef.current = dots;
  }, []);

  useEffect(() => {
    buildGrid();
    window.addEventListener('resize', buildGrid);
    return () => window.removeEventListener('resize', buildGrid);
  }, [buildGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: px, y: py } = pointerRef.current;

      dotsRef.current.forEach(dot => {
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const distSq = dx * dx + dy * dy;
        const proxSq = Math.pow(config.proximity, 2);

        let color = config.baseColor;
        if (distSq < proxSq) {
          const t = 1 - Math.sqrt(distSq) / config.proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          color = `rgb(${r},${g},${b})`;
        }

        ctx.beginPath();
        ctx.arc(dot.cx + dot.xOffset, dot.cy + dot.yOffset, config.dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [baseRgb, activeRgb]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = e.pageX;
      const y = e.pageY;
      pointerRef.current = { x, y };

      dotsRef.current.forEach(dot => {
        const dist = Math.hypot(dot.cx - x, dot.cy - y);
        if (dist < config.proximity && !dot._active) {
          dot._active = true;
          gsap.to(dot, {
            xOffset: (dot.cx - x) * 0.3,
            yOffset: (dot.cy - y) * 0.3,
            duration: 0.4,
            onComplete: () => {
              gsap.to(dot, { xOffset: 0, yOffset: 0, duration: config.returnDuration, ease: "elastic.out(1, 0.3)" });
              dot._active = false;
            }
          });
        }
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    // pointer-events-none is CRITICAL here so clicks pass through to buttons
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="opacity-40" />
    </div>
  );
};

// --- MAIN LANDING PAGE ---
export default function LandingPage() {
    const [activeMetric, setActiveMetric] = useState(0);

  // Auto-rotating metrics for the "Live" feel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const handleButtonClick = (action: string) => {
    alert(`${action} button clicked!`);
  };

  return (
    <div className="relative min-h-screen bg-white text-slate-900">
      {/* 1. BACKGROUND (Does not block clicks) */}
      <GlobalDotGrid />

      {/* 2. CONTENT (Interaction happens here) */}
      <div className="relative z-10">

        {/* HERO */}
        <section className="pt-20 pb-32 px-6">
          <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="initial" animate="animate" variants={stagger}
            className="flex flex-col items-center text-center"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-sm mb-8 border border-blue-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              V2.0 LIVE MONITORING NOW ACTIVE
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl font-black tracking-tight mb-8">
              LiveGen <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 p-2">
                AI Powered Telemetry
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-slate-500 max-w-3xl mb-12 leading-relaxed">
              Experience the next generation of industrial maintenance. Real-time monitoring, 
              predictive AI analysis, and instant threshold response for your entire fleet.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-6">
              <Link href="/dashboard" className="group relative bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-200 overflow-hidden transition-all hover:scale-105 active:scale-95">
                <span className="relative z-10 flex items-center gap-2">View Live Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/dashboard" className="group relative bg-blue-100 text-black px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-200 overflow-hidden transition-all  active:scale-95">
                <span className="relative z-10 flex items-center gap-2">Request Quote <PlaneIcon className="w-5 h-5 transition-transform" /></span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
        </section>

      
              {/* 2. LIVE DASHBOARD PREVIEW (3D CARD EFFECT) */}
      <section className="py-20 -mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            whileHover={{ rotateX: 2, rotateY: -2 }}
            className="relative bg-slate-900 rounded-[2.5rem] p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-white/10"
          >
            <div className="bg-[#0f172a] rounded-[2rem] overflow-hidden border border-white/5">
              {/* Internal Dashboard Mockup */}
              <div className="flex flex-col md:flex-row h-[500px]">
                <div className="w-full md:w-64 border-r border-white/5 p-6 hidden md:block">
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-2 w-${i === 1 ? '32' : '24'} bg-white/${i === 1 ? '20' : '5'} rounded`} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-8">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-white font-bold text-2xl">Generator G-204 Pulse</h3>
                    <div className="flex gap-2">
                       <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">OPERATIONAL</div>
                    </div>
                  </div>
                  
                  {/* Animated Metric Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <MetricCard label="VOLTAGE" value="230.4" unit="V" active={activeMetric === 0} />
                    <MetricCard label="LOAD" value="84.2" unit="kW" active={activeMetric === 1} />
                    <MetricCard label="TEMP" value="72" unit="°C" active={activeMetric === 2} />
                    <MetricCard label="FUEL" value="12" unit="%" active={activeMetric === 3} />
                  </div>

                  <div className="h-48 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    <Activity className="text-blue-500 w-12 h-12 animate-pulse" />
                    <span className="ml-4 text-white/40 font-mono tracking-widest">LIVE TELEMETRY STREAM</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">
            Built for Mission-Critical <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Environments
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Feature 1: AI */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300">
            <div className="absolute -top-10 -right-10 opacity-10">
              <Activity className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Predictive AI</h3>
              <p className="text-blue-100 text-lg leading-relaxed">
                Analyzes vibration and heat patterns to predict engine failure 48 hours before it happens.
              </p>
            </div>
          </div>

          {/* Feature 2: Security */}
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300">
            <div className="absolute -top-10 -right-10 opacity-10">
              <ShieldCheck className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Multi-Level Access</h3>
              <p className="text-indigo-100 text-lg leading-relaxed">
                JWT-powered security layers ensure only authorized personnel can change threshold limits.
              </p>
            </div>
          </div>

          {/* Feature 3: Response */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300">
            <div className="absolute -top-10 -right-10 opacity-10">
              <Zap className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Instant Response</h3>
              <p className="text-emerald-50 text-lg leading-relaxed">
                Automatic shutdown triggers if voltage spikes beyond safety margins, saving your hardware.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* 4. SYSTEM ARCHITECTURE (VISUAL FLOW) */}
      <section className="py-32 bg-slate-950 text-white overflow-hidden ">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }}>
              <h2 className="text-5xl font-black mb-8 leading-tight">The Ecosystem <br/><span className="text-blue-500">of Reliability</span></h2>
              
              <div className="space-y-12">
                <Step num="01" title="Edge Collection" desc="Hardware sensors collect data at the generator source via Modbus." />
                <Step num="02" title="Secure Bridge" desc="Encrypted MQTT packets transmit data to the LiveGen Cloud." />
                <Step num="03" title="AI Validation" desc="Server-side algorithms filter noise and validate device health." />
                <Step num="04" title="User Interface" desc="Data is pushed via WebSockets to your dashboard in < 500ms." />
              </div>
            </motion.div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-[120px]" />
              <div className="relative bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                <div className="space-y-8">
                   <div className="flex justify-between border-b border-white/10 pb-6">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Parameter Monitor</span>
                      <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">Real-Time Status</span>
                   </div>
                   <ArchitectureRow label="Voltage Frequency" value="50.02 Hz" status="STABLE" />
                   <ArchitectureRow label="Engine RPM" value="1500 RPM" status="STABLE" />
                   <ArchitectureRow label="Oil Pressure" value="4.2 Bar" status="STABLE" />
                   <ArchitectureRow label="Exhaust Temp" value="340 °C" status="CRITICAL" alert />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CONTACT SECTION (GLASS-MORPHISM FORM) */}
      <section className="py-32 ">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[3rem] p-12 lg:p-20 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10">
               <Globe className="w-64 h-64" />
            </div>
            
            <div className="relative z-10 grid md:grid-cols-2 gap-16">
              <div>
                <h2 className="text-4xl font-black mb-6">Scale Your Fleet Monitoring</h2>
                <p className="text-blue-100 mb-10 text-lg">Schedule a technical demo with our IoT engineers today.</p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <Phone className="w-6 h-6" />
                    </div>
                    <span className="font-bold">+1 (888) LIVE-GEN</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <Mail className="w-6 h-6" />
                    </div>
                    <span className="font-bold">support@livegen.io</span>
                  </div>
                </div>
              </div>
              
              <form className="bg-white/10 p-8 rounded-3xl backdrop-blur-xl border border-white/20 shadow-inner">
                <div className="space-y-4">
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:bg-white/10 transition" placeholder="Your Name" />
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:bg-white/10 transition" placeholder="Corporate Email" />
                  <textarea rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:bg-white/10 transition" placeholder="Describe your fleet size..."></textarea>
                  <button className="w-full bg-white text-blue-900 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-all shadow-lg shadow-black/20">
                    Send Inquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

        {/* CTA FOOTER */}
<footer className="bg-slate-950 text-slate-300 py-16 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Top Section: CTA / Newsletter Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 md:p-12 mb-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Stay ahead of the grid.</h2>
            <p className="text-slate-400">Receive critical system updates and performance optimization tips every month.</p>
          </div>
          <form className="flex w-full md:w-auto min-w-[300px] gap-2">
            <input 
              type="email" 
              placeholder="engineer@company.com" 
              className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all"
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all group">
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap size={24} className="text-white" fill="currentColor" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">LiveGen</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              Next-generation telemetry for industrial power systems. Precision monitoring, predictive maintenance, and 99.9% uptime.
            </p>
            <div className="flex gap-5">
              <Twitter className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
              <Linkedin className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
              <Github className="w-5 h-5 cursor-pointer hover:text-blue-400 transition-colors" />
            </div>
          </div>

          {/* Links Columns */}
          <div className="col-span-1 flex flex-col gap-4">
            <h4 className="text-white font-semibold text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Real-time Dashboard</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Alert Systems</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">API Access</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Fleet Management</a></li>
            </ul>
          </div>

          <div className="col-span-1 flex flex-col gap-4">
            <h4 className="text-white font-semibold text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Case Studies</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Contact/Status Column */}
          <div className="col-span-2 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-500 font-medium">All Systems Operational</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm">support@livegen.io</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Global Headquarters: TX, USA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-6 items-center">
          <p className="text-xs text-slate-500">
            © 2026 LIVEGEN INDUSTRIAL SOLUTIONS INC.
          </p>
          <div className="flex gap-8 text-xs font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-black mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function MetricCard({ label, value, unit, active }: any) {
  return (
    <div className={`p-6 rounded-2xl border transition-all duration-500 ${active ? 'bg-blue-600 border-blue-400 scale-110 shadow-lg shadow-blue-500/30' : 'bg-white/5 border-white/10'}`}>
      <p className={`text-[10px] font-black tracking-widest mb-2 ${active ? 'text-blue-200' : 'text-slate-500'}`}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${active ? 'text-white' : 'text-slate-200'}`}>{value}</span>
        <span className={`text-xs ${active ? 'text-blue-200' : 'text-slate-500'}`}>{unit}</span>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc, color }: any) {
  const colors: any = {
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <motion.div whileHover={{ y: -10 }} className="p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm shadow-slate-200/50 group transition-all">
      <div className={`w-16 h-16 ${colors[color]} rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4">{title}</h3>
      <p className="text-slate-500 leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div className="flex gap-8 group">
      <div className="text-4xl font-black text-white/10 group-hover:text-blue-500 transition-colors">{num}</div>
      <div>
        <h4 className="text-xl font-bold mb-2">{title}</h4>
        <p className="text-slate-400 max-w-sm">{desc}</p>
      </div>
    </div>
  );
}

function ArchitectureRow({ label, value, status, alert }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{label}</span>
      <div className="flex items-center gap-6">
        <span className="font-mono text-white/60 text-sm">{value}</span>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${alert ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-white/5 border-white/20 text-slate-400'}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
