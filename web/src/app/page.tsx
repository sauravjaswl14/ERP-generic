import Header from '@/components/Header';
import Faq from '@/components/Faq';
import FinalCta from '@/components/FinalCta';
import Flow from '@/components/Flow';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import Modules from '@/components/Modules';
import ScrollProgress from '@/components/ScrollProgress';
import Showcase from '@/components/Showcase';
import SmoothScroll from '@/components/SmoothScroll';
import Workspaces from '@/components/Workspaces';

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <Flow />
        <Modules />
        <Showcase />
        <Workspaces />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
