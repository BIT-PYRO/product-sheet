'use client';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';

export default function Home() {
  const [activeService, setActiveService] = useState(0);
  const scrollRef = useRef(null);
  const stickyScrollRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: stickyScrollRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const totalCards = 4;
    const newIndex = Math.min(totalCards - 1, Math.floor(latest * totalCards));
    if (newIndex !== activeService) {
      setActiveService(newIndex);
    }
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let animationId;
    const scroll = () => {
      el.scrollLeft += 1;
      if (el.scrollLeft >= el.scrollWidth / 2) {
        el.scrollLeft = 0;
      }
      animationId = requestAnimationFrame(scroll);
    };
    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const interactiveServices = [
    {
      title: "MULTI-WAREHOUSE ROUTING",
      desc: "Scale your logistics seamlessly. Automatically route incoming orders to the nearest fulfillment center to reduce shipping costs and delivery times.",
      // icon: "🏭",
      stats: ["Smart order assignment", "Cross-location inventory transfer"]
    },
    {
      title: "DEMAND FORECASTING",
      desc: "Predict future sales trends using your historical data. Know exactly what to restock and when to prevent stockouts during peak seasons.",
      // icon: "🔮",
      stats: ["Predictive restocking alerts", "Seasonality adjustments"]
    },
    {
      title: "WORKFORCE & KYC TRACKING",
      desc: "Manage your internal team and delivery partners. Monitor performance metrics, handle KYC verification, and assign tasks automatically.",
      // icon: "🧑‍💼",
      stats: ["Real-time staff metrics", "Integrated KYC processing"]
    },
    {
      title: "FINANCIAL RECONCILIATION",
      desc: "Track every penny from revenue to expenses. Automatically reconcile payments, calculate true profit margins, and generate tax-ready reports.",
      // icon: "💰",
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
      title: "Inventory Control",
      desc: "Track stock levels, warehouse inventory and replenishment in real-time.",
    },
    {
      title: "Order Management",
      desc: "Seamlessly process orders, track shipments, and manage fulfillment across all channels.",
    },
    {
      title: "Customer Hub",
      desc: "Manage customer data, KYC verification, and interaction history in one unified CRM.",
    },
    {
      title: "Automated Workflows",
      desc: "Eliminate manual tasks with zero-touch automated pipelines for order processing.",
    },
    {
      title: "Real-Time Analytics",
      desc: "Monitor sales, revenue trends, and overall business health from interactive live dashboards.",
    },
    {
      title: "Unified Platform",
      desc: "Replace messy spreadsheets and disconnected software with a single command center.",
    },
  ];

  return (
    <main
      className="bg-gradient-to-b from-blue-200 via-blue-100 to-slate-50 dark:from-[#031B4E] dark:via-[#155EEF] dark:to-[#0A192F] min-h-screen text-slate-900 dark:text-white transition-colors duration-500"
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

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="backdrop-blur-lg bg-white/50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 shadow-xl dark:shadow-none transition-colors"
          >

            <p className="uppercase tracking-[6px] text-sm text-blue-600 dark:text-white/80 font-semibold">
              E-COMMERCE OPERATIONS PLATFORM
            </p>

            <h1 className="text-5xl lg:text-7xl font-light text-slate-900 dark:text-white mt-6 leading-tight antialiased [text-rendering:optimizeLegibility] [transform:translateZ(0)] [-webkit-text-stroke:0.3px_currentColor] drop-shadow-sm">
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

          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white dark:bg-white/5 rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-white/10 transition-colors"
          >

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
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-slate-900 dark:text-white font-light transition-colors">
              E-Commerce Operations Shouldn't
              <br className="hidden sm:block" />
              Be Complicated
            </h2>
          </motion.div>

          <div className="relative w-full">
            <div
              ref={scrollRef}
              className="flex overflow-x-auto gap-6 py-8 px-4 w-full hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
            >
              {[...cards, ...cards].map((card, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[32px] p-8 shadow-xl hover:shadow-2xl dark:shadow-none transition-all duration-300 hover:-translate-y-2 w-[320px] md:w-[380px] flex-shrink-0 cursor-pointer"
                >
                  <h3 className="text-slate-900 dark:text-white text-2xl font-medium mb-3">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 dark:text-white/70 text-base leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* SERVICES */}

      <section ref={stickyScrollRef} id="services" className="relative h-[400vh]">
        <div className="sticky top-0 h-[100dvh] flex flex-col justify-center overflow-hidden py-10">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="text-center text-slate-900 dark:text-white mb-8 lg:mb-16">
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light">
                Grow Your
                <br className="hidden sm:block" />
                Business
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="hidden lg:block space-y-4">
                {interactiveServices.map((service, index) => (
                  <div
                    key={service.title}
                    className={`w-full text-left rounded-2xl py-5 px-8 font-medium transition-all duration-500 ${activeService === index
                      ? "bg-blue-600 text-white shadow-lg scale-[1.02]"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 text-slate-400 dark:text-slate-500 opacity-50 scale-95"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{service.title}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative h-[450px]">
                {interactiveServices.map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{
                      opacity: activeService === index ? 1 : 0,
                      y: activeService === index ? 0 : 50,
                      pointerEvents: activeService === index ? "auto" : "none"
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 lg:p-12 shadow-2xl flex flex-col justify-center"
                  >
                    <h3 className="text-3xl lg:text-4xl text-slate-900 dark:text-white mb-4 font-semibold">
                      {service.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
                      {service.desc}
                    </p>

                    <div className="space-y-4">
                      {service.stats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-bold">
                            ✓
                          </div>
                          {stat}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}

      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="text-center text-7xl text-slate-900 dark:text-white font-light transition-colors"
          >
            Choose Your Plan
          </motion.h2>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-8 mt-12 lg:mt-20 w-full">

            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] lg:rounded-[40px] p-4 sm:p-6 lg:p-10 shadow-xl transition-colors w-full flex flex-col justify-between"
              >
                <h3 className="text-lg sm:text-xl lg:text-3xl font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>

                <div className="mt-4 lg:mt-6">
                  <span className="text-2xl sm:text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-xs sm:text-sm lg:text-base text-slate-500 dark:text-slate-400">/mo</span>
                </div>

                <Link href="/frontend/login" className="block text-center w-full mt-6 lg:mt-10 bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-blue-700 dark:hover:bg-slate-100 py-2 lg:py-4 rounded-xl lg:rounded-2xl transition-colors text-sm lg:text-base font-medium">
                  Get Started
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

            <h2 className="text-7xl text-slate-900 dark:text-white font-light transition-colors">
              Let's Get a Demo


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

          </motion.div>

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