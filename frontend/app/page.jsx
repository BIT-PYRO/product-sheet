'use client';
import { useState, useRef } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup, useScroll, useMotionValueEvent } from 'framer-motion';
import Preloader from '@/components/ui/Preloader';
import BackgroundEffect from '@/components/ui/BackgroundEffect';
import InteractiveText from '@/components/ui/InteractiveText';
import SmartStatCard from '@/components/ui/SmartStatCard';

export default function Home() {
  const [activeService, setActiveService] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  const servicesRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: servicesRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    let index = Math.floor(latest * 4);
    if (index > 3) index = 3;
    if (index < 0) index = 0;
    if (index !== activeService) {
      setActiveService(index);
    }
  });

  const interactiveServices = [
    {
      title: "MULTI-WAREHOUSE ROUTING",
      desc: "Scale your logistics seamlessly. Automatically route incoming orders to the nearest fulfillment center to reduce shipping costs and delivery times.",
      stats: ["Smart order assignment", "Cross-location inventory transfer"]
    },
    {
      title: "DEMAND FORECASTING",
      desc: "Predict future sales trends using your historical data. Know exactly what to restock and when to prevent stockouts during peak seasons.",
      stats: ["Predictive restocking alerts", "Seasonality adjustments"]
    },
    {
      title: "WORKFORCE & KYC TRACKING",
      desc: "Manage your internal team and delivery partners. Monitor performance metrics, handle KYC verification, and assign tasks automatically.",
      stats: ["Real-time staff metrics", "Integrated KYC processing"]
    },
    {
      title: "FINANCIAL RECONCILIATION",
      desc: "Track every penny from revenue to expenses. Automatically reconcile payments, calculate true profit margins, and generate tax-ready reports.",
      stats: ["Automated profit calculation", "One-click ledger sync"]
    },
  ];

  const plans = [
    { 
      name: "STARTER", 
      price: "$19",
      desc: "Perfect for small teams getting started with operations.",
      features: ["Up to 5 Users", "Basic Analytics", "1 Warehouse Location", "Email Support"]
    },
    { 
      name: "BUSINESS", 
      price: "$49",
      desc: "Everything you need to scale your growing e-commerce brand.",
      features: ["Up to 20 Users", "Advanced Forecasting", "5 Warehouse Locations", "Priority 24/7 Support", "Custom API Access"],
      popular: true
    },
    { 
      name: "ENTERPRISE", 
      price: "$99",
      desc: "Advanced security and custom features for large organizations.",
      features: ["Unlimited Users", "Predictive AI Models", "Unlimited Locations", "Dedicated Success Manager", "SSO & Advanced Security"]
    },
  ];

  const cards = [
    {
      title: "Inventory Control",
      desc: "Track stock levels, warehouse inventory and replenishment in real-time.",
      metrics: [
        { label: "Accuracy", value: "99.9%" },
        { label: "Updates", value: "Real-time" },
        { label: "Locations", value: "Unlimited" },
        { label: "Alerts", value: "Automated" }
      ]
    },
    {
      title: "Order Management",
      desc: "Seamlessly process orders, track shipments, and manage fulfillment across all channels.",
      metrics: [
        { label: "Processing", value: "< 1s" },
        { label: "Channels", value: "Omni" },
        { label: "Tracking", value: "Live" },
        { label: "Fulfillment", value: "Auto-routed" }
      ]
    },
    {
      title: "Customer Hub",
      desc: "Manage customer data, KYC verification, and interaction history in one unified CRM.",
      metrics: [
        { label: "KYC Auth", value: "Instant" },
        { label: "Profiles", value: "Unified 360" },
        { label: "History", value: "Detailed" },
        { label: "Support", value: "Integrated" }
      ]
    },
    {
      title: "Automated Workflows",
      desc: "Eliminate manual tasks with zero-touch automated pipelines for order processing.",
      metrics: [
        { label: "Triggers", value: "Custom" },
        { label: "Actions", value: "100+" },
        { label: "Reliability", value: "99.99%" },
        { label: "Setup", value: "No-code" }
      ]
    },
    {
      title: "Real-Time Analytics",
      desc: "Monitor sales, revenue trends, and overall business health from interactive live dashboards.",
      metrics: [
        { label: "Dashboards", value: "Customizable" },
        { label: "Export", value: "CSV/PDF" },
        { label: "Metrics", value: "Live" },
        { label: "Insights", value: "AI-driven" }
      ]
    },
    {
      title: "Unified Platform",
      desc: "Replace messy spreadsheets and disconnected software with a single command center.",
      metrics: [
        { label: "Integration", value: "API First" },
        { label: "Security", value: "Enterprise" },
        { label: "Uptime", value: "99.99%" },
        { label: "Scale", value: "Infinite" }
      ]
    },
  ];

  return (
    <LayoutGroup>
      {showSplash && <Preloader onComplete={() => setShowSplash(false)} />}
      <main
        className="relative min-h-screen transition-colors duration-500 overflow-clip"
      >

        {/* NAVBAR */}

        <AnimatePresence>
        {!showSplash && (
          <motion.nav 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 w-full z-50"
          >
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-full px-8 py-4 flex justify-between items-center transition-colors">

                <motion.h1 layoutId="logo-j" className="text-slate-900 dark:text-white text-xl font-bold flex items-center overflow-hidden">
                  J<motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96], delay: 0.4 }}>ANKI</motion.span>
                </motion.h1>

            <div className="hidden md:flex gap-5 lg:gap-6 text-slate-600 dark:text-white/80 font-medium text-sm lg:text-base">
              <InteractiveText Component="a" href="#home" text="Home" className="hover:text-blue-600 dark:hover:text-white transition-colors" />
              <InteractiveText Component="a" href="#features" text="Features" className="hover:text-blue-600 dark:hover:text-white transition-colors" />
              <InteractiveText Component="a" href="#services" text="Services" className="hover:text-blue-600 dark:hover:text-white transition-colors" />
              <InteractiveText Component="a" href="#pricing" text="Pricing" className="hover:text-blue-600 dark:hover:text-white transition-colors" />
              <InteractiveText Component="a" href="#contact" text="Contact" className="hover:text-blue-600 dark:hover:text-white transition-colors" />
            </div>

              <div className="flex items-center gap-4">
                <ThemeToggle />
                <Link href="/frontend/login" className="bg-blue-600 dark:bg-white text-white dark:text-blue-700 px-5 py-2 rounded-full font-medium hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors">
                  <InteractiveText Component="span" text="Get Started" />
                </Link>
              </div>

            </div>
          </div>
        </motion.nav>
        )}
        </AnimatePresence>

      {/* HERO */}

      <section
        id="home"
        className="relative min-h-screen flex flex-col justify-center pt-32 pb-16"
      >
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-cyan-300/20 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center z-10 relative">

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="backdrop-blur-lg bg-white/50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 shadow-xl dark:shadow-none transition-colors"
          >

            <InteractiveText 
              Component="p" 
              text="E-COMMERCE OPERATIONS PLATFORM" 
              className="uppercase tracking-[6px] text-sm text-blue-600 dark:text-white/80 font-semibold" 
            />

            <InteractiveText 
              Component="h1"
              text="Run Your Entire Business From One Dashboard"
              className="text-5xl lg:text-7xl font-light text-slate-900 dark:text-white mt-6 leading-tight antialiased [text-rendering:optimizeLegibility] [transform:translateZ(0)] [-webkit-text-stroke:0.3px_currentColor] drop-shadow-sm" 
            />

            <InteractiveText 
              Component="p" 
              text="Manage products, inventory, orders, customers and analytics from one place." 
              className="text-slate-600 dark:text-white/80 mt-6 text-lg" 
            />

            <div className="flex gap-4 mt-8">
              <Link href="/frontend/login" className="bg-blue-600 dark:bg-white text-white dark:text-blue-700 font-medium px-8 py-4 rounded-xl hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors">
                <InteractiveText Component="span" text="Book Demo" />
              </Link>

            </div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white dark:bg-white/5 rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-white/10 transition-colors"
          >

            <div className="grid grid-cols-2 gap-4 grid-rows-3 h-full">

              <div className="bg-blue-100/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-3xl p-6 col-span-2 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <InteractiveText Component="p" text="Total Orders" className="text-slate-600 dark:text-slate-400 z-10" />
                <InteractiveText Component="h3" text="12,450" className="text-5xl font-bold text-slate-900 dark:text-white mt-4 z-10" />
              </div>

              <div className="bg-sky-100/80 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-3xl p-6 col-span-1 row-span-2 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-sky-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <InteractiveText Component="p" text="Revenue" className="text-slate-600 dark:text-slate-400 z-10" />
                <div className="mt-8">
                  <InteractiveText Component="h3" text="$84K" className="text-4xl font-bold text-slate-900 dark:text-white z-10" />
                  <InteractiveText Component="p" text="+12% this month" className="text-xs text-emerald-500 font-medium z-10 mt-2 block" />
                </div>
              </div>

              <div className="bg-indigo-100/80 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-3xl p-6 col-span-1 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 w-16 h-16 bg-indigo-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <InteractiveText Component="p" text="Customers" className="text-slate-600 dark:text-slate-400 z-10 text-sm" />
                <InteractiveText Component="h3" text="2,340" className="text-2xl font-bold text-slate-900 dark:text-white mt-1 z-10" />
              </div>

              <div className="bg-cyan-100/80 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-3xl p-6 col-span-1 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-cyan-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <InteractiveText Component="p" text="Products" className="text-slate-600 dark:text-slate-400 z-10 text-sm" />
                <InteractiveText Component="h3" text="890" className="text-2xl font-bold text-slate-900 dark:text-white mt-1 z-10" />
              </div>

            </div>

          </motion.div>

        </div>
      </section>

      {/* FEATURES */}

      <section id="features" className="pt-24 pb-12 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 flex justify-center"
          >
            <InteractiveText 
              Component="h2" 
              text="E-Commerce Operations Shouldn't Be Complicated" 
              className="text-3xl md:text-4xl lg:text-5xl text-slate-900 dark:text-white font-light transition-colors max-w-3xl leading-snug" 
            />
          </motion.div>

          <div className="w-full overflow-hidden relative flex py-10 -mx-6 px-6 [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
            <motion.div
              className="flex w-max gap-6"
              animate={{ x: [0, "-50%"] }}
              transition={{ duration: 25, ease: "linear", repeat: Infinity }}
            >
              {[...cards, ...cards].map((card, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className="w-[350px] shrink-0 h-full z-10"
                >
                  <SmartStatCard 
                    title={card.title}
                    desc={card.desc}
                    metrics={card.metrics}
                    index={index % cards.length}
                  />
                </div>
              ))}
            </motion.div>
          </div>

        </div>
      </section>

      {/* SERVICES */}

      <section id="services" ref={servicesRef} className="relative h-[400vh]">
        <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 w-full">

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="text-center text-slate-900 dark:text-white transition-colors mb-16"
            >
              <InteractiveText 
                Component="h2"
                text="Grow Your Business"
                className="text-5xl md:text-6xl lg:text-7xl font-light mx-auto" 
              />
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                {interactiveServices.map((service, index) => (
                  <div
                    key={service.title}
                    className={`w-full text-left rounded-2xl py-5 px-8 font-medium transition-all duration-300 ${activeService === index
                        ? "bg-blue-600 text-white shadow-lg dark:shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-[1.02]"
                        : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-300 opacity-50 scale-[0.98]"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{service.title}</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              <div className="relative min-h-[380px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeService}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 lg:p-12 shadow-2xl flex flex-col justify-center"
                  >
                    <InteractiveText Component="h3" text={interactiveServices[activeService].title} className="text-3xl lg:text-4xl text-slate-900 dark:text-white mb-4 font-semibold" />
                    <InteractiveText Component="p" text={interactiveServices[activeService].desc} className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8" />

                    <div className="space-y-4">
                      {interactiveServices[activeService].stats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold shrink-0">
                            ✓
                          </div>
                          <InteractiveText Component="span" text={stat} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* PRICING */}

      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <InteractiveText Component="h2" text="Choose Your Plan" className="text-center text-7xl text-slate-900 dark:text-white font-light transition-colors" />
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mt-20">

            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex flex-col justify-between bg-white dark:bg-white/5 border rounded-[40px] p-10 shadow-xl transition-all duration-300 ${
                  plan.popular 
                  ? 'border-blue-500 shadow-blue-500/20 dark:shadow-blue-500/10 scale-105 z-10' 
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <div>
                  <InteractiveText Component="h3" text={plan.name} className="text-3xl font-semibold text-slate-900 dark:text-white" />
                  <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm min-h-[40px]">
                    {plan.desc}
                  </p>

                  <div className="mt-6 flex items-baseline">
                    <InteractiveText Component="span" text={plan.price} className="text-6xl font-bold text-slate-900 dark:text-white mr-2" />
                    <InteractiveText Component="span" text="/month" className="text-slate-500 dark:text-slate-400" />
                  </div>

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-slate-700 dark:text-slate-300 text-sm">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px] font-bold shrink-0 mr-3 mt-0.5">
                          ✓
                        </div>
                        <InteractiveText Component="span" text={feature} />
                      </li>
                    ))}
                  </ul>
                </div>

                <Link 
                  href="/frontend/login" 
                  className={`flex justify-center text-center w-full mt-10 py-4 rounded-2xl transition-colors font-medium ${
                    plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                  }`}
                >
                  <InteractiveText Component="span" text="Get Started" />
                </Link>
              </motion.div>
            ))}

          </div>

        </div>
      </section>

      {/* CONTACT */}

      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-[50px] p-16 shadow-2xl dark:shadow-none transition-colors"
          >

            <InteractiveText Component="h2" text="Let's Talk" className="text-7xl text-slate-900 dark:text-white font-light transition-colors" />

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

          </motion.div>

        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 transition-colors z-10 relative">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-slate-500 dark:text-white/50 transition-colors">
          <InteractiveText Component="span" text="© 2026 JANKI. All Rights Reserved." />
        </div>
      </footer>

    </main>
    </LayoutGroup>
  );
}