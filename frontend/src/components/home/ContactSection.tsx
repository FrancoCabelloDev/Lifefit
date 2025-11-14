import React from 'react'

const ContactSection: React.FC = () => {
  return (
    <section
      id="contacto"
      className="bg-slate-50 py-14 md:py-20 border-t border-slate-100"
    >
      <div className="mx-auto max-w-5xl px-4 grid gap-10 md:grid-cols-2 items-start">
        {/* Info de contacto */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-3">
            Contacto
          </h2>
          <p className="text-sm md:text-base text-slate-600 mb-4">
            ¿Tienes dudas sobre cómo implementar Lifefit en tu gimnasio o quieres
            probar la plataforma como atleta? Escríbenos y nuestro equipo te
            responderá lo antes posible.
          </p>

          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Email: </span>
              contacto@lifefit.com
            </div>
            <div>
              <span className="font-semibold text-slate-900">Teléfono: </span>
              +52 55 1234 5678
            </div>
            <div>
              <span className="font-semibold text-slate-900">Horario: </span>
              Lunes a viernes · 9:00 a 18:00 (GMT-5)
            </div>
            <div>
              <span className="font-semibold text-slate-900">Ubicación: </span>
              Ciudad de México, MX
            </div>
          </div>
        </div>

        {/* Formulario (solo UI, sin backend todavía) */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Envíanos un mensaje
          </h3>
          <form className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                           text-slate-800 outline-none focus:border-emerald-500 focus:bg-white
                           placeholder:text-slate-400"
                placeholder="Ingresa tu nombre"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                           text-slate-800 outline-none focus:border-emerald-500 focus:bg-white
                           placeholder:text-slate-400"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tipo de consulta
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                           text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                defaultValue="gimnasio"
              >
                <option value="gimnasio">Implementar en mi gimnasio</option>
                <option value="atleta">Soy atleta individual</option>
                <option value="soporte">Soporte técnico</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mensaje
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                           text-slate-800 outline-none focus:border-emerald-500 focus:bg-white
                           resize-none placeholder:text-slate-400"
                placeholder="Cuéntanos en qué podemos ayudarte"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-full bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Enviar mensaje
            </button>

            <p className="text-[11px] text-slate-500 mt-1">
              Al enviar este formulario aceptas ser contactado por el equipo de
              Lifefit.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
