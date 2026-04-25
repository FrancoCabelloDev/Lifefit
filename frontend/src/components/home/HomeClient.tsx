'use client'
import { useEffect } from 'react'
import HeaderSection from './HeaderSection'
import HeroSection from './HeroSection'
import HowItWorksSection from './HowItWorksSection'
import CoreFeaturesSection from './CoreFeaturesSection'
import PlansSection from './PlansSection'
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
    <div className="antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <HeaderSection />
      <main className="flex-grow">
        <HeroSection />
        <HowItWorksSection />
        <CoreFeaturesSection />
        <PlansSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  )
}
