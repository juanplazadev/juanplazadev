import { Route, Routes } from "react-router";

import PageLayout from "@/layouts/PageLayout";
import RootLayout from "@/layouts/RootLayout";
import Architecture from "@/pages/Architecture";
import ArchitectureDetail from "@/pages/ArchitectureDetail";
import Blog from "@/pages/Blog";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Post from "@/pages/Post";

export default function App() {
  return (
    <Routes>
      {/* The hero layout. Only the landing page earns it. */}
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
      </Route>

      {/* Everything else: compact header, same shell. */}
      <Route element={<PageLayout />}>
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<Post />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="architecture/:slug" element={<ArchitectureDetail />} />
        {/* Without this the layout route matches nothing on an unknown path and
            the page renders completely blank, not just an empty <main>. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
