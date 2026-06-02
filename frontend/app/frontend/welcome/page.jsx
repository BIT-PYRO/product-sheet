'use client';

import Link from "next/link";
import { ArrowRight, Layers, Moon, Sun, User, Mail, Info, FileText, CheckCircle2, Shield, Zap, Package, ShoppingCart, Users } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function WelcomePage() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-blue-100 to-slate-50 dark:from-[#031B4E] dark:via-[#155EEF] dark:to-[#0A192F] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-500 overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-full px-8 py-4 flex justify-between items-center transition-colors">
            
            <h1 className="text-slate-900 dark:text-white text-xl font-semibold">
              JANKI
            </h1>
            
            <div className="hidden md:flex gap-5 lg:gap-6 text-slate-600 dark:text-white/80 font-medium text-sm lg:text-base">
              <a href="#about" className="hover:text-blue-600 dark:hover:text-white transition-colors">About Us</a>
              <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a>
              <a href="#contact" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <Link 
                href="/profile" 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                aria-label="Go to Profile"
              >
                <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-16">
        
        {/* Welcome Hero Section */}
        <section className="relative px-4 sm:px-6 flex flex-col items-center justify-center min-h-[85vh] text-center mb-16 overflow-hidden">
          
          {/* Decorative Blur Orbs */}
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-400/20 dark:bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

          <div className="max-w-4xl mx-auto relative z-10 bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-10 md:p-16 rounded-[40px] shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium mb-8 border border-green-200 dark:border-green-500/20 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Authentication Successful
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white">
              Welcome to your Workspace
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 leading-relaxed max-w-2xl mx-auto">
              Everything you need to manage your business operations is just one click away. Ready to jump in?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link 
                href="/mydesk" 
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transition-all active:scale-95 hover:-translate-y-1"
              >
                Go to Dashboard
                <ArrowRight className="w-6 h-6" />
              </Link>

              <Link 
                href="/profile" 
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 px-10 py-5 text-lg font-bold text-slate-700 dark:text-white bg-white/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 backdrop-blur-md rounded-full hover:bg-white/80 dark:hover:bg-white/10 transition-all active:scale-95 hover:-translate-y-1"
              >
                Setup Profile
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="pt-8 pb-12 relative scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Workspace Features</h2>
              <p className="text-slate-600 dark:text-slate-400">Everything you have access to in your new workspace.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Secure Operations</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Your data is securely isolated with enterprise-grade protection and role-based permissions.</p>
              </div>
              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Zap className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Real-time Analytics</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">View real-time graphs and operational insights directly on your new personalized dashboard.</p>
              </div>
              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Automated KYC</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Seamlessly manage and verify your workforce and customers with our integrated KYC tools.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Package className="w-8 h-8 text-amber-500 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Centralized Inventory</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Track stock levels across multiple warehouses in real-time to completely eliminate stockouts.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <ShoppingCart className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Order Fulfillment</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Seamlessly manage the entire lifecycle of an order from checkout to final delivery.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 transition-all group">
                <Users className="w-8 h-8 text-rose-500 dark:text-rose-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Workforce Management</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Monitor your internal team's performance, assign tasks, and automate daily HR operations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section - Premium Redesign */}
        <section id="about" className="py-24 relative overflow-hidden transition-colors scroll-mt-32">
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
        <section id="contact" className="py-20 relative scroll-mt-32">
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
      <footer className="border-t border-slate-200 dark:border-white/10 py-5 bg-white dark:bg-black transition-colors duration-300">
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
