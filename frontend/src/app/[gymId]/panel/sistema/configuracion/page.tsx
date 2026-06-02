'use client'

import { useEffect, useState, use, useRef } from 'react'
import { 
  Settings, 
  Save, 
  Upload, 
  Palette, 
  Building,
  Info,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  CloudUpload,
  Shield,
  QrCode,
  Download,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { api } from '@/lib/api'
import type { Gym, PaginatedResponse } from '@/lib/types'
import QRCode from 'qrcode'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export default function ConfigPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = use(params)
  const { gymId } = resolvedParams
  
  const [gymData, setGymData] = useState<Gym | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchGymData()
  }, [])

  useEffect(() => {
    if (!gymData?.slug) return
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.lifefit.pe'
    const qrUrl = `${origin}/${gymData.slug}/checkin/qr`
    QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).then(setQrDataUrl).catch(console.error)
  }, [gymData?.slug])

  const fetchGymData = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<PaginatedResponse<Gym>>("/api/gyms/gyms/", {
        params: { slug: gymId }
      })
      const gym = data.results?.[0] || (Array.isArray(data) ? data[0] : null)
      if (gym) {
        setGymData(gym)
        const timestamp = new Date().getTime()
        const logoUrl = gym.logo
          ? (gym.logo.startsWith('http') ? gym.logo : `${API_BASE}${gym.logo}`)
          : null
        setPreviewUrl(logoUrl ? `${logoUrl}?t=${timestamp}` : null)
      }
    } catch (err) {
      console.error('Error fetching gym data:', err)
      setError('No se pudo cargar la información del gimnasio.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido.')
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(gymData?.logo || null)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Siempre mostramos el diálogo para cambios críticos como Identidad
    setShowConfirmDialog(true)
  }

  const performSave = async () => {
    if (!gymData) return

    try {
      setIsSaving(true)
      setError('')
      setSuccessMessage('')

      const formData = new FormData()
      formData.append('name', gymData.name)
      formData.append('brand_color', gymData.brand_color || '#10b981')

      if (selectedFile) {
        formData.append('logo', selectedFile)
      }

      await api.patch(`/api/gyms/gyms/${gymData.id}/`, formData, { formData: true })

      setSuccessMessage('¡Configuración actualizada con éxito!')
      await fetchGymData()
      setSelectedFile(null)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Ocurrió un error inesperado al intentar guardar.')
    } finally {
      setIsSaving(false)
      setShowConfirmDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p>Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración del Gimnasio</h1>
          <p className="text-slate-500">Personaliza la identidad visual y datos de tu sucursal.</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Plan Premium Activo
        </Badge>
      </div>

      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>¡Éxito!</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleFormSubmit}>
        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden bg-white rounded-3xl">
          <CardHeader className="border-b border-slate-100 p-8 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Perfil de Identidad</CardTitle>
                <CardDescription>Gestiona el nombre, logo y colores de tu gimnasio en un solo lugar.</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-10">
            {/* Sección 1: Información General */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-px bg-slate-100" /> Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="gymName" className="text-slate-700 font-bold text-sm">Nombre del Gimnasio</Label>
                  <Input 
                    id="gymName" 
                    value={gymData?.name || ''} 
                    onChange={(e) => setGymData(prev => prev ? {...prev, name: e.target.value} : null)}
                    className="h-12 bg-white border-slate-200 focus:ring-emerald-500/20 text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymSlug" className="text-slate-700 font-bold text-sm">Slug del Gimnasio (URL)</Label>
                  <div className="relative">
                     <Input 
                      id="gymSlug" 
                      value={gymData?.slug || ''} 
                      disabled 
                      className="h-12 bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed font-mono text-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Shield className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Identidad Visual (Logo) */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-px bg-slate-100" /> Logo de Marca
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Vista Previa */}
                <div className="lg:col-span-4 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-48 h-48 rounded-[2rem] bg-white border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-2xl ring-8 ring-slate-50 transition-all">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-6 animate-in fade-in duration-500" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-200">
                          <ImageIcon className="w-16 h-16" />
                          <span className="text-[10px] font-black uppercase">Sin Logo</span>
                        </div>
                      )}
                    </div>
                    {selectedFile && (
                      <button 
                        type="button"
                        onClick={clearSelection}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-xl hover:bg-rose-600 hover:scale-110 transition-all z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Actual</p>
                    {selectedFile && (
                      <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-600 border-emerald-200 font-bold">
                        Nuevo logo seleccionado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Dropzone */}
                <div className="lg:col-span-8">
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`
                      relative h-48 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-500
                      ${isDragging ? 'border-emerald-500 bg-emerald-50/50 scale-[0.98]' : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-emerald-200'}
                    `}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-emerald-600 text-white shadow-xl rotate-12' : 'bg-white text-slate-400 shadow-md group-hover:shadow-lg'}`}>
                      <CloudUpload className="w-8 h-8" />
                    </div>
                    <div className="text-center px-6">
                      <p className="text-base font-bold text-slate-700">Arrastra tu logo aquí</p>
                      <p className="text-sm text-slate-500 mt-1">Formatos PNG o JPG (Máximo 5MB)</p>
                    </div>
                    <div className="absolute bottom-4 right-6">
                       <Button type="button" variant="link" className="text-emerald-600 font-bold text-xs p-0 h-auto">
                        O búscalo en tu equipo
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Colores */}
            <div className="space-y-6 pt-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-px bg-slate-100" /> Color de Identidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <input 
                      id="colorPicker"
                      type="color" 
                      value={gymData?.brand_color || '#10b981'}
                      onChange={(e) => setGymData(prev => prev ? {...prev, brand_color: e.target.value} : null)}
                      className="w-20 h-20 rounded-2xl cursor-pointer border-none p-0 bg-transparent relative z-10"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-4 ring-white shadow-xl" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Código Hexadecimal</Label>
                    <Input 
                      value={gymData?.brand_color || '#10b981'}
                      onChange={(e) => setGymData(prev => prev ? {...prev, brand_color: e.target.value} : null)}
                      className="font-mono uppercase text-xl h-14 bg-white border-slate-200 shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 border-l border-slate-200 pl-8 hidden md:flex">
                  <div 
                    className="w-12 h-12 rounded-xl shrink-0 shadow-lg" 
                    style={{ backgroundColor: gymData?.brand_color || '#10b981' }}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Personalización Activa</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Este tono se aplicará automáticamente a los botones y elementos del panel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Sección 4: QR de Acceso */}
            <div className="space-y-6 pt-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-px bg-slate-100" /> QR de Acceso
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="lg:col-span-5 flex flex-col items-center gap-4">
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR de acceso" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-200">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Escanea para ingresar
                  </p>
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800">Check-in con QR</h4>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Imprime este código QR y colócalo en la entrada de tu gimnasio. Tus socios
                      podrán escanearlo con su cámara para registrar su ingreso automáticamente.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={qrDataUrl}
                      download={`checkin-qr-${gymData?.slug || 'gym'}.png`}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white rounded-2xl h-12 px-6 font-bold text-sm transition-all shadow-lg active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      Descargar QR
                    </a>
                    {gymData?.slug && (
                      <a
                        href={`/${gymData.slug}/checkin/qr`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl h-12 px-6 font-bold text-sm transition-all active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Vista previa
                      </a>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    <p className="font-bold">¿Cómo funciona?</p>
                    <p className="mt-1 text-amber-700">
                      El socio debe haber iniciado sesión en LifeFit desde su navegador. Al escanear
                      el código QR, la página detecta su sesión y registra el check-in automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 p-8 flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-slate-900 hover:bg-black text-white px-10 h-14 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-3" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white rounded-[2.5rem] border-none shadow-2xl p-10 max-w-md">
          <AlertDialogHeader className="space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto rotate-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-slate-900 text-center leading-tight">
                ¿Confirmar cambios de identidad?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 text-center text-base leading-relaxed">
                Estás a punto de actualizar los datos maestros de tu gimnasio. Estos cambios son visibles para todos tus socios.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex-col sm:flex-col gap-3">
             <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                performSave();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              Sí, guardar cambios
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-2xl h-14 font-bold text-slate-500 border-none hover:bg-slate-100 transition-all">
              Revisar de nuevo
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
