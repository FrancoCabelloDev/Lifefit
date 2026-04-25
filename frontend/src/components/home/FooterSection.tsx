import React from 'react'

const FooterSection: React.FC = () => {
  return (
    <footer className="bg-gray-50 dark:bg-gray-950 w-full py-12 border-t border-gray-200 dark:border-gray-800 flat z-10 relative">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 items-center gap-4">
        {/* Brand / Copyright */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-gray-900 dark:text-white font-lexend text-xl">LifeFit</span>
          <span className="font-lexend text-xs text-gray-500">© 2024 LifeFit SaaS. Transformando el esfuerzo.</span>
        </div>
        
        {/* Links */}
        <ul className="flex flex-wrap md:justify-end gap-6 font-lexend text-xs">
          <li>
            <a className="text-gray-400 hover:text-emerald-400 underline transition-all" href="#">
              Política de Privacidad
            </a>
          </li>
          <li>
            <a className="text-gray-400 hover:text-emerald-400 underline transition-all" href="#">
              Términos de Servicio
            </a>
          </li>
          <li>
            <a className="text-gray-400 hover:text-emerald-400 underline transition-all" href="#">
              Contactar Soporte
            </a>
          </li>
          <li>
            <a className="text-gray-400 hover:text-emerald-400 underline transition-all" href="#">
              Documentación API
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}

export default FooterSection
