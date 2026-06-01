'use client';

import Link from "next/link";
import { ArrowRight, BarChart3, Box, CheckCircle2, Layers, LogIn, Mail, Package, ShieldCheck, Zap, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-300">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.15),rgba(248,250,252,1))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.3),rgba(0,0,0,1))] pointer-events-none transition-colors duration-500" />

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-black/40 border-b border-slate-200 dark:border-white/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] dark:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">JANKI PRODUCT</span>
          </div>
          <div className="flex items-center gap-6 md:gap-8">
            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#solutions" className="hover:text-blue-600 dark:hover:text-white transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-blue-600 dark:hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link 
                href="/frontend/login" 
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-slate-700 dark:text-white bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 rounded-full transition-all active:scale-95"
              >
                Sign In
                <LogIn className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-200 dark:border-blue-500/20 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            The New Standard in Business Operations
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-[1.1] text-slate-900 dark:text-white transition-colors duration-300">
            Manage your entire operation <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-600">
              from a single dashboard.
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
            Eliminate disconnected tools and gain total visibility. Janki Product seamlessly integrates inventory, orders, and workforce management into one powerful platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link 
              href="/frontend/login" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] dark:hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-95"
            >
              Start Building Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#demo" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 dark:text-white bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 backdrop-blur-sm shadow-sm dark:shadow-none"
            >
              Book a Demo
            </a>
          </div>

          {/* Interactive Dashboard Mockup */}
          <div className="w-full max-w-5xl mt-20 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-15 dark:opacity-25 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative rounded-2xl bg-white/80 dark:bg-black/60 border border-slate-200 dark:border-white/10 backdrop-blur-xl p-4 sm:p-6 shadow-2xl overflow-hidden transition-colors duration-300">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/80"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Metric Cards */}
                {[
                  { title: "Total Revenue", value: "$124,563.00", trend: "+14.5%", icon: BarChart3, color: "text-blue-600 dark:text-blue-400" },
                  { title: "Active Orders", value: "1,204", trend: "+5.2%", icon: Box, color: "text-cyan-600 dark:text-cyan-400" },
                  { title: "Inventory Status", value: "98.5%", trend: "Healthy", icon: Package, color: "text-green-600 dark:text-green-400" }
                ].map((metric, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                      <metric.icon className={`w-5 h-5 ${metric.color}`} />
                      <span className="text-xs font-medium px-2 py-1 bg-slate-200 dark:bg-white/10 rounded-md text-slate-700 dark:text-white">{metric.trend}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">{metric.title}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Challenges & Solutions */}
        <section id="solutions" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight transition-colors duration-300">The ultimate solution to operational chaos.</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 transition-colors duration-300">Stop wasting time juggling disconnected tools, losing track of inventory, and lacking visibility into your team's performance.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature Cards */}
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-500/30 group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Inventory Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Real-time sync across all your locations. Never over-sell or run out of stock with our predictive analytics engine.</p>
              </div>

              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center mb-6 border border-cyan-200 dark:border-cyan-500/30 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Automated Workflows</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Connect order processing, fulfillment, and accounting into one continuous, zero-touch automated pipeline.</p>
              </div>

              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-200 dark:border-purple-500/30 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Complete Visibility</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Access beautiful, customizable dashboards to track workforce performance, KYC status, and revenue streams instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 relative border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Scale without limits.</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">Simple, transparent pricing tailored for modern companies.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Pro Plan */}
              <div className="relative p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-md">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Growth</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">For scaling startups and small teams.</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">$99</span>
                  <span className="text-slate-500 dark:text-slate-400 mb-1">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Up to 20 users', 'Core inventory & orders', 'Standard analytics', 'Email support'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/frontend/login" className="block w-full py-3 px-6 text-center rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-medium transition-colors border border-slate-200 dark:border-white/10">
                  Start Free Trial
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="relative p-8 rounded-3xl bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/40 dark:to-black border border-blue-200 dark:border-blue-500/30 backdrop-blur-md shadow-xl dark:shadow-[0_0_40px_rgba(37,99,235,0.2)]">
                <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide rounded-full">
                  Most Popular
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Scale</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">For large organizations requiring ultimate control.</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">$299</span>
                  <span className="text-slate-500 dark:text-slate-400 mb-1">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['Unlimited users', 'Advanced automation', 'Custom integrations', '24/7 Priority support'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/frontend/login" className="block w-full py-3 px-6 text-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg dark:shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact/CTA */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-600/10 border-y border-slate-200 dark:border-white/10" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready to streamline your operations?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
              Join industry leaders who use JANKI PRODUCT to automate, track, and scale their businesses effectively.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="name@company.com" 
                className="flex-1 bg-white dark:bg-black/50 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-md shadow-sm dark:shadow-none"
              />
              <button className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                Book Demo <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-12 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">JANKI PRODUCT</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Janki Product. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
