import { Route, Routes } from "react-router";

import PageLayout from "@/layouts/PageLayout";
import RootLayout from "@/layouts/RootLayout";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
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

      <Route element={<PageLayout />}>
        <Route path="create-blog" element={<BlogPost />} />
      </Route>

      {/* Everything else: compact header, same shell. */}
      <Route element={<PageLayout />}>
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<Post />} />
        {/* Without this the layout route matches nothing on an unknown path and
            the page renders completely blank, not just an empty <main>. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
