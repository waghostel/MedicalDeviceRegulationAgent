import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'
import { MedevAISection } from '@/components/medevai-section'
import { KiroSection } from '@/components/kiro-section'
import { FAQSection } from '@/components/faq-section'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main>
        <HeroSection />
        <MedevAISection />
        <KiroSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}