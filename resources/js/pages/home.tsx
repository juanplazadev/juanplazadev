import { Head } from '@inertiajs/react';

import About from '@/components/resume/about';
import Contact from '@/components/resume/contact';
import CurrentlyBuilding from '@/components/resume/currently-building';
import Education from '@/components/resume/education';
import Experience from '@/components/resume/experience';
import OpenSource from '@/components/resume/open-source';
import Skills from '@/components/resume/skills';
import SiteLayout from '@/layouts/site-layout';
//import Writing from "@/components/resume/writing";

export default function Home() {
    return (
        <>
            {/* The one page whose title is the bare site title rather than a
          "Page - Juan Plaza" pair, so the tab reads as the site itself. */}
            <Head title="Software Engineer">
                <meta
                    name="description"
                    content="Juan Plaza is a software engineer who owns production systems end to end, building with Laravel, Spring Boot, React and TypeScript."
                    head-key="description"
                />
            </Head>

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

Home.layout = SiteLayout;
