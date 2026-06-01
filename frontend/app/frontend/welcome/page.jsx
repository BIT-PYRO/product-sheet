'use client';

import Link from "next/link";
import { ArrowRight, Layers, Moon, Sun, User, Mail, Info, FileText, CheckCircle2, Shield, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function WelcomePage() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300 overflow-x-hidden">
      {/* Background Gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.15),rgba(248,250,252,1))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.3),rgba(0,0,0,1))] pointer-events-none transition-colors duration-500" />

      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-black/40 border-b border-slate-200 dark:border-white/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] dark:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">JANKI PRODUCT</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#about" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-white transition-colors">
              <Info className="w-4 h-4" /> About Us
            </a>
            <a href="#features" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-white transition-colors">
              <FileText className="w-4 h-4" /> Features
            </a>
            <a href="#contact" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-white transition-colors">
              <Mail className="w-4 h-4" /> Contact
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {/* Profile Button linking to /profile */}
            <Link 
              href="/profile" 
              className="p-2 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all active:scale-95"
              aria-label="Go to Profile"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-16">
        
        {/* Welcome Hero Section */}
        <section className="px-4 sm:px-6 flex flex-col items-center justify-center min-h-[60vh] text-center mb-16">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium mb-8 border border-green-200 dark:border-green-500/20 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Authentication Successful
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
              Welcome to your Workspace
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed">
              Everything you need to manage your business operations is just one click away. Ready to jump in?
            </p>

            <Link 
              href="/home" 
              className="inline-flex items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transition-all active:scale-95 hover:-translate-y-1"
            >
              Start Now
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Workspace Features</h2>
              <p className="text-slate-600 dark:text-slate-400">Everything you have access to in your new workspace.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Secure Operations</h3>
                <p className="text-slate-600 dark:text-slate-400">Your data is securely isolated with enterprise-grade protection and role-based permissions.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Zap className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Real-time Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400">View real-time graphs and operational insights directly on your new personalized dashboard.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Automated KYC</h3>
                <p className="text-slate-600 dark:text-slate-400">Seamlessly manage and verify your workforce and customers with our integrated KYC tools.</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section - Premium Redesign */}
        <section id="about" className="py-24 relative overflow-hidden bg-slate-100/30 dark:bg-black/20 border-y border-slate-200 dark:border-white/5 transition-colors">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-600/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* Text Side */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-medium mb-6 border border-blue-200 dark:border-blue-500/20">
                  <Info className="w-4 h-4" /> Who We Are
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
                  Empowering your business <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">to scale flawlessly.</span>
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                  Janki Product is dedicated to providing cutting-edge SaaS solutions that empower businesses to 
                  overcome operational hurdles. Built with modern web technologies, our platform ensures seamless 
                  inventory management, secure workforce enrollment, and a flawless user experience across all devices.
                </p>
                <div className="flex gap-6">
                  <div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">99.9%</div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Uptime SLA</div>
                  </div>
                  <div className="w-px bg-slate-200 dark:bg-white/10"></div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">24/7</div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Expert Support</div>
                  </div>
                </div>
              </div>

              {/* Visual Side */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl blur-2xl opacity-20 dark:opacity-30"></div>
                <div className="relative bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Simplifying complexity</p>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic mb-6">
                    "We built this platform because we were tired of fragmented tools. We believe that when your operations are unified, your potential is limitless."
                  </p>
                  <div className="flex items-center gap-3 border-t border-slate-200 dark:border-white/10 pt-6">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">The Janki Team</div>
                      <div className="text-xs text-slate-500">Founders & Engineers</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Contact Support</h2>
                <p className="text-slate-600 dark:text-slate-400">Need help getting started? Send us a message.</p>
              </div>
              
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                    <input type="text" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                    <input type="email" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                  <textarea rows="4" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="How can we help you?"></textarea>
                </div>
                <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-colors">
                  Send Message
                </button>
              </form>
            </div>
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
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Janki Product Workspace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
