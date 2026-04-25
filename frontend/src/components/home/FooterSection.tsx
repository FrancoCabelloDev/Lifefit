import React from 'react'
import Link from 'next/link'

const FooterSection: React.FC = () => {
  return (
    <footer className="bg-[#050505] border-t border-zinc-800/50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-12 md:grid-cols-4">
          
          {/* Brand Col */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-yellow-400 tracking-wider">LIFEFIT</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-xs">
              Gamificación inteligente para gimnasios que quieren fidelizar y motivar a sus clientes.
            </p>
          </div>

          {/* Links Col 1 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">Producto</h4>
            <ul className="mt-6 space-y-3">
              <li>
                <Link href="#funciones" className="text-sm text-zinc-400 transition hover:text-white">
                  Características
                </Link>
              </li>
              <li>
                <Link href="#planes" className="text-sm text-zinc-400 transition hover:text-white">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="#sobre-nosotros" className="text-sm text-zinc-400 transition hover:text-white">
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">Legal</h4>
            <ul className="mt-6 space-y-3">
              <li>
                <Link href="#" className="text-sm text-zinc-400 transition hover:text-white">
                  Términos
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-zinc-400 transition hover:text-white">
                  Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">Contacto</h4>
            <ul className="mt-6 space-y-3">
              <li>
                <a href="mailto:info@lifefit.app" className="text-sm text-zinc-400 transition hover:text-white">
                  info@lifefit.app
                </a>
              </li>
              <li>
                <a href="https://twitter.com/lifefit_app" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-white">
                  @lifefit_app
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  )
}

export default FooterSection
