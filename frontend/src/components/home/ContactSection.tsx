import React from 'react'

const ContactSection: React.FC = () => {
  return (
    <section
      id="contacto"
      className="border-t border-slate-100 bg-slate-50 py-14 text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:py-20"
    >
      <div className="mx-auto grid max-w-5xl items-start gap-10 px-4 md:grid-cols-2">
        {/* Info de contacto */}
        <div>
          <h2 className="mb-3 text-2xl font-semibold md:text-3xl">
            Contacto
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            ¿Tienes dudas sobre cómo implementar Lifefit en tu gimnasio o quieres
            probar la plataforma como atleta? Escríbenos y nuestro equipo te
            responderá lo antes posible.
          </p>

          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <span className="font-semibold">Email: </span>
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold">
            Envíanos un mensaje
          </h3>
          <form className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Nombre completo
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Ingresa tu nombre"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tipo de consulta
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                defaultValue="gimnasio"
              >
                <option value="gimnasio">Implementar en mi gimnasio</option>
                <option value="atleta">Soy atleta individual</option>
                <option value="soporte">Soporte técnico</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Mensaje
              </label>
              <textarea
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Cuéntanos en qué podemos ayudarte"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-full bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Enviar mensaje
            </button>

            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
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
