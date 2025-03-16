import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Chat from './pages/Chat';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Chat />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </HashRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
