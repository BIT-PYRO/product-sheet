import re

def main():
    filepath = r'e:\BRANCH\product-sheet\frontend\app\page.jsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import ThemeToggle
    content = "import { ThemeToggle } from '@/components/theme-toggle';\n\n" + content

    # Main wrapper
    content = content.replace(
        'className="\n      bg-gradient-to-b\n      from-[#031B4E]\n      via-[#155EEF]\n      to-[#D9F2FF]\n      min-h-screen\n      "',
        'className="bg-slate-50 dark:bg-gradient-to-b dark:from-[#031B4E] dark:via-[#155EEF] dark:to-[#0A192F] min-h-screen text-slate-900 dark:text-white transition-colors duration-500"'
    )

    # Navbar container
    content = content.replace(
        'bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 flex justify-between items-center',
        'bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-full px-8 py-4 flex justify-between items-center transition-colors'
    )

    # Navbar Logo
    content = content.replace('text-white text-xl font-semibold', 'text-slate-900 dark:text-white text-xl font-semibold')
    
    # Navbar links
    content = content.replace('flex gap-8 text-white', 'flex gap-8 text-slate-600 dark:text-white/80 font-medium')
    
    # Navbar Get Started Button
    content = content.replace(
        '<button className="bg-white text-blue-700 px-5 py-2 rounded-full font-medium">\n              Get Started\n            </button>',
        '<div className="flex items-center gap-4">\n              <ThemeToggle />\n              <button className="bg-blue-600 dark:bg-white text-white dark:text-blue-700 px-5 py-2 rounded-full font-medium hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors">\n                Get Started\n              </button>\n            </div>'
    )

    # Hero E-COMMERCE text
    content = content.replace('uppercase tracking-[6px] text-sm text-white', 'uppercase tracking-[6px] text-sm text-blue-600 dark:text-white/80 font-semibold')
    
    # Hero H1
    content = content.replace('text-7xl font-light text-white mt-6', 'text-7xl font-light text-slate-900 dark:text-white mt-6')

    # Hero Subtitle
    content = content.replace('text-white/80 mt-6 text-lg', 'text-slate-600 dark:text-white/80 mt-6 text-lg')

    # Hero Book Demo Button
    content = content.replace('bg-white text-blue-700 px-8 py-4 rounded-xl', 'bg-blue-600 dark:bg-white text-white dark:text-blue-700 font-medium px-8 py-4 rounded-xl hover:bg-blue-700 dark:hover:bg-slate-100 transition-colors')

    # Hero Learn More Button
    content = content.replace('border border-white/30 text-white px-8 py-4 rounded-xl', 'border border-slate-300 dark:border-white/30 text-slate-700 dark:text-white font-medium px-8 py-4 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors')

    # Hero Glass Card
    content = content.replace('backdrop-blur-lg bg-white/10 border border-white/20 rounded-[40px] p-10', 'backdrop-blur-lg bg-white/50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 shadow-xl dark:shadow-none transition-colors')

    # Hero Stats Container
    content = content.replace('bg-white rounded-[40px] p-10 shadow-2xl', 'bg-white dark:bg-white/5 rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-white/10 transition-colors')

    # Stats text colors
    content = content.replace('<p>Total Orders</p>', '<p className="text-slate-600 dark:text-slate-800">Total Orders</p>')
    content = content.replace('<p>Revenue</p>', '<p className="text-slate-600 dark:text-slate-800">Revenue</p>')
    content = content.replace('<p>Customers</p>', '<p className="text-slate-600 dark:text-slate-800">Customers</p>')
    content = content.replace('<p>Products</p>', '<p className="text-slate-600 dark:text-slate-800">Products</p>')
    content = content.replace('text-3xl font-bold', 'text-3xl font-bold text-slate-900') # keep slate-900 inside the colored boxes

    # Problem Section Title
    content = content.replace('text-7xl text-white font-light', 'text-7xl text-slate-900 dark:text-white font-light transition-colors')

    # Problem Cards
    content = content.replace('backdrop-blur-xl bg-white/10 border border-white/20 rounded-[35px] p-8', 'backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[35px] p-8 shadow-lg dark:shadow-none transition-colors')
    
    # Problem Card Title
    content = content.replace('text-white text-3xl mt-8', 'text-slate-900 dark:text-white text-3xl mt-8 font-medium')
    
    # Problem Card Desc
    content = content.replace('text-white/75 mt-5', 'text-slate-600 dark:text-white/75 mt-5')

    # Services Section Title
    content = content.replace('text-center text-white', 'text-center text-slate-900 dark:text-white transition-colors')

    # Services Tags
    content = content.replace('bg-white/10 border border-white/20 rounded-full py-5 px-8 text-white text-center', 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-full py-5 px-8 text-slate-800 dark:text-white text-center shadow-sm dark:shadow-none font-medium transition-colors')

    # Services Right Card
    content = content.replace('bg-white/10 border border-white/20 rounded-[40px] p-10', 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/20 rounded-[40px] p-10 shadow-xl dark:shadow-none transition-colors')
    
    content = content.replace('text-4xl text-white mb-8', 'text-4xl text-slate-900 dark:text-white mb-8 font-light')

    # Pricing Section Title
    content = content.replace('text-center text-7xl text-white font-light', 'text-center text-7xl text-slate-900 dark:text-white font-light transition-colors')

    # Pricing Cards
    content = content.replace('bg-white rounded-[40px] p-10 shadow-xl', 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[40px] p-10 shadow-xl transition-colors')
    
    content = content.replace('text-3xl font-semibold', 'text-3xl font-semibold text-slate-900 dark:text-white')
    content = content.replace('text-6xl font-bold', 'text-6xl font-bold text-slate-900 dark:text-white')
    content = content.replace('<span>/month</span>', '<span className="text-slate-500 dark:text-slate-400">/month</span>')

    # Contact Section
    content = content.replace('bg-white/10 backdrop-blur-xl border border-white/20 rounded-[50px] p-16', 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-[50px] p-16 shadow-2xl dark:shadow-none transition-colors')

    content = content.replace('text-7xl text-white font-light', 'text-7xl text-slate-900 dark:text-white font-light')

    content = content.replace('className="w-full rounded-2xl p-4"', 'className="w-full rounded-2xl p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"')

    content = content.replace('bg-white text-blue-700 px-8 py-4 rounded-2xl', 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-blue-700 dark:hover:bg-slate-100 font-medium px-8 py-4 rounded-2xl transition-colors')

    # Footer
    content = content.replace('bg-slate-950 border-t border-white/10', 'bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 transition-colors')
    content = content.replace('text-white/50', 'text-slate-500 dark:text-white/50')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Updated page.jsx successfully.")

if __name__ == "__main__":
    main()
