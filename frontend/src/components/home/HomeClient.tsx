'use client'
import TestimonialsSection from './TestimonialsSection'
import { useEffect } from 'react'
import HeroSection from './HeroSection'
import CoreFeaturesSection from './CoreFeaturesSection'
import HowItWorksSection from './HowItWorksSection'
import FeaturedFunctionsSection from './FeaturedFunctionsSection'
import GymsSection from './GymsSection'
import PlansSection from './PlansSection'
import FAQSection from './FAQSection'
import CTASection from './CTASection'
import FooterSection from './FooterSection'
import AboutSection from './AboutSection'
import ContactSection from './ContactSection'
import { useTheme } from '@/hooks/useTheme'

type HomeClientProps = {
  initialSection?: string
}

export default function HomeClient({ initialSection }: HomeClientProps) {
  const { theme } = useTheme()

  useEffect(() => {
    if (!initialSection) return
    const el = document.getElementById(initialSection)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [initialSection])

  return (
    <main className={`min-h-screen transition-colors ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <HeroSection />
      <AboutSection /> 
      <CoreFeaturesSection />
      <HowItWorksSection />
      <FeaturedFunctionsSection />
      <GymsSection />
      <TestimonialsSection />
      <PlansSection />
      <FAQSection />
      <ContactSection /> 
      <CTASection />
      <FooterSection />
    </main>
  )
}
