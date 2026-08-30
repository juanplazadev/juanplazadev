import About from "@/components/About";
import Contact from "@/components/Contact";
import CurrentlyBuilding from "@/components/CurrentlyBuilding";
import Education from "@/components/Education";
import Experience from "@/components/Experience";
import OpenSource from "@/components/OpenSource";
import Skills from "@/components/Skills";
//import Writing from "@/components/Writing";

export default function Home() {
  return (
    <>
      <About />
      <Experience />
      <CurrentlyBuilding />
      <OpenSource />
      <Skills />
      <Education />
      {/*<Writing />*/}
      <Contact />
    </>
  );
}
