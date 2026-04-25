'use client'
import { useEffect } from 'react'
import HeroSection from './HeroSection'
import CoreFeaturesSection from './CoreFeaturesSection'
import HowItWorksSection from './HowItWorksSection'
import PlansSection from './PlansSection'
import AboutSection from './AboutSection'
import CTASection from './CTASection'
import FooterSection from './FooterSection'

type HomeClientProps = {
  initialSection?: string
}

export default function HomeClient({ initialSection }: HomeClientProps) {
  useEffect(() => {
    if (!initialSection) return
    const el = document.getElementById(initialSection)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [initialSection])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <HeroSection />
      <CoreFeaturesSection />
      <HowItWorksSection />
      <PlansSection />
      <AboutSection /> 
      <CTASection />
      <FooterSection />
    </main>
  )
}
