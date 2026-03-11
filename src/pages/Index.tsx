import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import DeveloperSection from "@/components/landing/DeveloperSection";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen dark">
    <Navbar />
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <DeveloperSection />
    <Footer />
  </div>
);

export default Index;
