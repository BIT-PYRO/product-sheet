'use client';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export default function Home() {
  const [activeService, setActiveService] = useState(0);

  const interactiveServices = [
    {
      title: "MULTI-WAREHOUSE ROUTING",
      desc: "Scale your logistics seamlessly. Automatically route incoming orders to the nearest fulfillment center to reduce shipping costs and delivery times.",
      icon: "🏭",
      stats: ["Smart order assignment", "Cross-location inventory transfer"]
    },
    {
      title: "DEMAND FORECASTING",
      desc: "Predict future sales trends using your historical data. Know exactly what to restock and when to prevent stockouts during peak seasons.",
      icon: "🔮",
      stats: ["Predictive restocking alerts", "Seasonality adjustments"]
    },
    {
      title: "WORKFORCE & KYC TRACKING",
      desc: "Manage your internal team and delivery partners. Monitor performance metrics, handle KYC verification, and assign tasks automatically.",
      icon: "🧑‍💼",
      stats: ["Real-time staff metrics", "Integrated KYC processing"]
    },
    {
      title: "FINANCIAL RECONCILIATION",
      desc: "Track every penny from revenue to expenses. Automatically reconcile payments, calculate true profit margins, and generate tax-ready reports.",
      icon: "💰",
      stats: ["Automated profit calculation", "One-click ledger sync"]
    },
  ];

  const plans = [
    { name: "STARTER", price: "$19" },
    { name: "BUSINESS", price: "$49" },
    { name: "ENTERPRISE", price: "$99" },
  ];

  const cards = [
    {
      icon: "📦",
      title: "Inventory Control",
      desc: "Track stock levels, warehouse inventory and replenishment in real-time.",
    },
    {
      icon: "🛒",
      title: "Order Management",
      desc: "Seamlessly process orders, track shipments, and manage fulfillment across all channels.",
    },
    {
      icon: "👥",
      title: "Customer Hub",
      desc: "Manage customer data, KYC verification, and interaction history in one unified CRM.",
    },
    {
      icon: "⚡",
      title: "Automated Workflows",
      desc: "Eliminate manual tasks with zero-touch automated pipelines for order processing.",
    },
    {
      icon: "📊",
      title: "Real-Time Analytics",
      desc: "Monitor sales, revenue trends, and overall business health from interactive live dashboards.",
    },
    {
      icon: "🔗",
      title: "Unified Platform",
      desc: "Replace messy spreadsheets and disconnected software with a single command center.",
    },
  ];

  return (
    <main
      className="bg-gradient-to-b from-blue-200 via-blue-100 to-slate-50 dark:from-[#031B4E] dark:via-[#155EEF] dark:to-[#0A192F] min-h-screen text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden"
    >

      {/* NAVBAR */}

      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-full px-8 py-4 flex justify-between items-center transition-colors">

            <h1 className="text-slate-900 dark:text-white text-xl font-semibold">
              JANKI
            </h1>

            <div className="hidden md:flex gap-5 lg:gap-6 text-slate-600 dark:text-white/80 font-medium text-sm lg:text-base">
              <a href="#home" className="hover:text-blue-600 dark:hover:text-white transition-colors">Home</a>
              <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a>
              <a href="#services" className="hover:text-blue-600 dark:hover:text-white transition-colors">Services</a>
              <a href="#pricing" className="hover:text-blue-600 dark:hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/frontend/login" className="bg-blue-600 dark:bg-white text-white dark:text-blue-700 px-5 py-2 rounded-full font-medium hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors">
                Get Started
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* HERO */}

      <section
        id="home"
        className="relative min-h-screen flex flex-col justify-center pt-32 pb-16"
      >
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-cyan-300/20 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center z-10 relative">

          <div className="backdrop-blur-lg bg-white/50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 shadow-xl dark:shadow-none transition-colors">

            <p className="uppercase tracking-[6px] text-sm text-blue-600 dark:text-white/80 font-semibold">
              E-COMMERCE OPERATIONS PLATFORM
            </p>

            <h1 className="text-5xl lg:text-7xl font-light text-slate-900 dark:text-white mt-6 leading-tight antialiased">
              Run Your Entire
              <br />
              Business From
              <br />
              One Dashboard
            </h1>

            <p className="text-slate-600 dark:text-white/80 mt-6 text-lg">
              Manage products, inventory, orders,
              customers and analytics from one place.
            </p>

            <div className="flex gap-4 mt-8">
              <Link href="/frontend/login" className="bg-blue-600 dark:bg-white text-white dark:text-blue-700 font-medium px-8 py-4 rounded-xl hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors">
                Book Demo
              </Link>


            </div>

          </div>

          <div className="bg-white dark:bg-white/5 rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-white/10 transition-colors">

            <div className="grid grid-cols-2 gap-4">

              <div className="bg-blue-100 rounded-2xl p-6">
                <p className="text-slate-600 dark:text-slate-800">Total Orders</p>
                <h3 className="text-3xl font-bold text-slate-900">12,450</h3>
              </div>

              <div className="bg-sky-100 rounded-2xl p-6">
                <p className="text-slate-600 dark:text-slate-800">Revenue</p>
                <h3 className="text-3xl font-bold text-slate-900">$84K</h3>
              </div>

              <div className="bg-indigo-100 rounded-2xl p-6">
                <p className="text-slate-600 dark:text-slate-800">Customers</p>
                <h3 className="text-3xl font-bold text-slate-900">2,340</h3>
              </div>

              <div className="bg-cyan-100 rounded-2xl p-6">
                <p className="text-slate-600 dark:text-slate-800">Products</p>
                <h3 className="text-3xl font-bold text-slate-900">890</h3>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* FEATURES */}

      <section id="features" className="pt-24 pb-12 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-slate-900 dark:text-white font-light transition-colors">
              E-Commerce Operations Shouldn't
              <br className="hidden sm:block" />
              Be Complicated
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {cards.map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[24px] p-5 shadow-lg dark:shadow-none transition-colors"
              >
                <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-2xl">
                  {card.icon}
                </div>

                <h3 className="text-slate-900 dark:text-white text-xl font-medium">
                  {card.title}
                </h3>

                <p className="text-slate-600 dark:text-white/75 mt-2 text-sm">
                  {card.desc}
                </p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* SERVICES */}

      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center text-slate-900 dark:text-white transition-colors mb-16">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-light">
              Grow Your
              <br className="hidden sm:block" />
              Business
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            <div className="space-y-4">
              {interactiveServices.map((service, index) => (
                <button
                  key={service.title}
                  onClick={() => setActiveService(index)}
                  className={`w-full text-left rounded-2xl py-5 px-8 font-medium transition-all duration-300 ${activeService === index
                      ? "bg-blue-600 text-white shadow-lg dark:shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-[1.02]"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{service.title}</span>
                    <span className="text-2xl">{service.icon}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 lg:p-12 shadow-2xl transition-all duration-500 min-h-[380px] flex flex-col justify-center">
              <div className="text-5xl mb-6">{interactiveServices[activeService].icon}</div>
              <h3 className="text-3xl lg:text-4xl text-slate-900 dark:text-white mb-4 font-semibold">
                {interactiveServices[activeService].title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
                {interactiveServices[activeService].desc}
              </p>

              <div className="space-y-4">
                {interactiveServices[activeService].stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                      ✓
                    </div>
                    {stat}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* PRICING */}

      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <h2 className="text-center text-7xl text-slate-900 dark:text-white font-light transition-colors">
            Choose Your Plan
          </h2>

          <div className="grid lg:grid-cols-3 gap-8 mt-20">

            {plans.map((plan) => (
              <div
                key={plan.name}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[40px] p-10 shadow-xl transition-colors"
              >
                <h3 className="text-3xl font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>

                <div className="mt-6">
                  <span className="text-6xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">/month</span>
                </div>

                <Link href="/frontend/login" className="block text-center w-full mt-10 bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-blue-700 dark:hover:bg-slate-100 py-4 rounded-2xl transition-colors font-medium">
                  Get Started
                </Link>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* CONTACT */}

      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-[50px] p-16 shadow-2xl dark:shadow-none transition-colors">

            <h2 className="text-7xl text-slate-900 dark:text-white font-light transition-colors">
              Let's Talk
            </h2>

            <form className="space-y-4 mt-10">

              <input
                type="text"
                placeholder="Your Name"
                className="w-full rounded-2xl p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />

              <input
                type="email"
                placeholder="Your Email"
                className="w-full rounded-2xl p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />

              <textarea
                rows={5}
                placeholder="Your Message"
                className="w-full rounded-2xl p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />

              <button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-blue-700 dark:hover:bg-slate-100 font-medium px-8 py-4 rounded-2xl transition-colors">
                Send Message
              </button>

            </form>

          </div>

        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-slate-500 dark:text-white/50 transition-colors">
          © 2026 JANKI. All Rights Reserved.
        </div>
      </footer>

    </main>
  );
}