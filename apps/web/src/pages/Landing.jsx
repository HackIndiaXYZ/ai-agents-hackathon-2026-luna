import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import MarketIntelligenceSection from '../components/landing/MarketIntelligenceSection';
import AIAgentsSection from '../components/landing/AIAgentsSection';
import LucySection from '../components/landing/LucySection';
import WhyTradeNexusSection from '../components/landing/WhyTradeNexusSection';
import MultilingualSection from '../components/landing/MultilingualSection';
import IntelligenceSection from '../components/landing/IntelligenceSection';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import useLandingData from '../hooks/useLandingData';

export const Landing = () => {
  const {
    portfolio,
    prices,
    alerts,
    lucyInsights,
    learningStats,
    commodityCount,
    liveConnected,
  } = useLandingData();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans antialiased">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSection
          portfolio={portfolio}
          prices={prices}
          lucyInsights={lucyInsights}
          alerts={alerts}
          liveConnected={liveConnected}
        />
        <MarketIntelligenceSection
          prices={prices}
          commodityCount={commodityCount}
          lucyInsights={lucyInsights}
        />
        <AIAgentsSection />
        <LucySection prices={prices} />
        <WhyTradeNexusSection />
        <MultilingualSection learningStats={learningStats} />
        <IntelligenceSection />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
};

export default Landing;
