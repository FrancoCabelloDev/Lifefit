import React from 'react'

const FooterSection: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-200 pt-10 pb-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-4 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
                Lf
              </div>
              <span className="font-semibold">Lifefit</span>
            </div>
            <p className="text-xs text-slate-400">
              La plataforma gamificada que transforma tu forma de entrenar. Retos,
              ranking y progreso en un solo lugar.
            </p>
            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <div>contacto@lifefit.com</div>
              <div>+52 55 1234 5678</div>
              <div>Ciudad de México, MX</div>
            </div>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Producto</h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>Funciones</li>
              <li>Precios</li>
              <li>Integraciones</li>
              <li>Changelog</li>
              <li>Roadmap</li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Empresa</h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>Sobre nosotros</li>
              <li>Carreras</li>
              <li>Contacto</li>
              <li>Prensa</li>
              <li>Partners</li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Recursos</h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>Blog</li>
              <li>Ayuda</li>
              <li>Documentación</li>
              <li>Comunidad</li>
              <li>Status</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-4 text-[11px] text-slate-500">
          <div className="space-x-3">
            <span>Términos de Servicio</span>
            <span>Política de Privacidad</span>
            <span>Cookies</span>
          </div>
          <div>© 2025 Lifefit. Todos los derechos reservados.</div>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
