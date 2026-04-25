'use client'
import React, { useState, useRef, useEffect } from 'react'

const HeaderSection: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md docked full-width top-0 sticky border-b border-gray-100 dark:border-gray-800 shadow-sm z-50">
      <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto font-lexend tracking-tight">
        {/* Brand */}
        <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400">
          LifeFit
        </div>
        
        {/* Links (Desktop) */}
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <a className="text-gray-500 dark:text-gray-400 font-medium hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors active:scale-95 duration-200" href="#product">
              Producto
            </a>
          </li>
          <li>
            <a className="text-gray-500 dark:text-gray-400 font-medium hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors active:scale-95 duration-200" href="#solutions">
              Soluciones
            </a>
          </li>
          <li>
            <a className="text-gray-500 dark:text-gray-400 font-medium hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors active:scale-95 duration-200" href="#pricing">
              Precios
            </a>
          </li>
        </ul>
        
        {/* Trailing Actions */}
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors p-2 rounded-full">
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
          
          {/* Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-emerald-600 dark:text-emerald-400 font-medium px-4 py-2 rounded-full transition-colors"
            >
              Ingresar
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Cuenta</div>
                <a href="/tugimnasio" className="text-sm text-gray-700 dark:text-gray-200 hover:text-emerald-500 transition-colors">
                  Acceso a Socios
                </a>
                <a href="/unirse" className="text-sm font-medium text-emerald-500 flex items-center justify-between hover:text-emerald-600 transition-colors pt-2">
                  Registrarse
                  <span className="material-symbols-outlined text-sm">arrow_outward</span>
                </a>
              </div>
            )}
          </div>
          
          <a className="hidden sm:inline-flex bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-full hover:bg-emerald-600 transition-colors active:scale-95 duration-200" href="#get-started">
            Comenzar
          </a>
        </div>
      </nav>
    </header>
  )
}

export default HeaderSection
