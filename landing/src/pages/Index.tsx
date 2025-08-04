import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ChatDemo from '@/components/ChatDemo';
import FeaturesGrid from '@/components/FeaturesGrid';
import PricingSection from '@/components/PricingSection';
import SocialProof from '@/components/SocialProof';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <ChatDemo />
      <FeaturesGrid />
      <PricingSection />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
