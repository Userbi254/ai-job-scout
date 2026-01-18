import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import CrawlScrapePage from "./pages/CrawlScrapePage";
import ExtractPage from "./pages/ExtractPage";
import SortPage from "./pages/SortPage";
import CVPage from "./pages/CVPage";
import TrashPage from "./pages/TrashPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SidebarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/crawl" element={<CrawlScrapePage />} />
              <Route path="/extract" element={<ExtractPage />} />
              <Route path="/sort" element={<SortPage />} />
              <Route path="/cv" element={<CVPage />} />
              <Route path="/trash" element={<TrashPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SidebarProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
