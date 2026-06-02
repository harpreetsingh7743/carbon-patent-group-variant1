import './App.css'
import SiteHeader from './components/site-header'
import HeroSection from './pages/hero-section'
import IntroSection from './pages/intro-section'
import AwardsAndAchievementsSection from './pages/awards-and-achievements'

function App() {
  return (
    <main className="app-shell">
      <div className="app-shell__header">
        <SiteHeader />
      </div>
      <HeroSection />
      <IntroSection />
      <AwardsAndAchievementsSection />
    </main>
  )
}

export default App
