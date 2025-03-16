import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, MessageSquare, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChatSession } from '../hooks/useChat';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatSidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    onClearSessions: () => void;
}

export function ChatSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    onClearSessions,
}: ChatSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

    useEffect(() => {
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed) {
            setCollapsed(savedCollapsed === 'true');
        }
    }, []);

    const toggleCollapse = () => {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        localStorage.setItem('sidebar-collapsed', String(newCollapsed));

        const event = new CustomEvent('sidebar-collapse-change', {
            detail: { collapsed: newCollapsed },
        });
        window.dispatchEvent(event);

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: 'sidebar-collapsed',
                newValue: String(newCollapsed),
            })
        );
    };

    return (
        <div
            className={cn(
                'h-full border-r border-border bg-grok-dark flex flex-col transition-all duration-300',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            <div className={cn('p-4 flex', collapsed ? 'justify-center' : '')}>
                {!collapsed && (
                    <Button onClick={onCreateSession} className="w-full bg-grok-input hover:bg-grok-input/90">
                        <Plus className="mr-2 h-4 w-4" />
                        New Chat
                    </Button>
                )}
                {collapsed && (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onCreateSession}
                                    size="icon"
                                    className="bg-grok-input hover:bg-grok-input/90 h-9 w-9"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs">New Chat</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className={cn('px-2 py-2', collapsed ? 'flex flex-col items-center' : '')}>
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn('relative group', collapsed ? 'w-auto mb-2' : 'w-full')}
                            onMouseEnter={() => setHoveredSessionId(session.id)}
                            onMouseLeave={() => setHoveredSessionId(null)}
                        >
                            {collapsed ? (
                                <div className="relative">
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    onClick={() => onSelectSession(session.id)}
                                                    className={cn(
                                                        'h-9 w-9 rounded-md flex items-center justify-center relative',
                                                        currentSessionId === session.id
                                                            ? 'bg-grok-input text-foreground ring-2 ring-primary/20 shadow-sm shadow-primary/20'
                                                            : 'bg-grok-dark text-muted-foreground hover:text-muted-foreground'
                                                    )}
                                                >
                                                    <MessageSquare
                                                        className={cn(
                                                            'h-4 w-4',
                                                            currentSessionId === session.id ? 'text-primary' : ''
                                                        )}
                                                    />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-[200px]">
                                                <p className="text-xs truncate">{session.title}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    {currentSessionId === session.id && (
                                        <div className="absolute left-0 top-1.5 h-6 w-1 bg-primary rounded-r-md shadow-sm shadow-primary/40" />
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => onSelectSession(session.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2 p-2 rounded-md text-sm text-left mb-1 transition-colors',
                                        currentSessionId === session.id
                                            ? 'bg-grok-input text-foreground'
                                            : 'text-muted-foreground hover:bg-grok-input/60 hover:text-foreground'
                                    )}
                                >
                                    <MessageSquare className="h-4 w-4 shrink-0" />
                                    <span className="truncate flex-1">{session.title}</span>
                                </button>
                            )}

                            {!collapsed && (hoveredSessionId === session.id || currentSessionId === session.id) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 rounded-full opacity-70 hover:opacity-100 hover:bg-secondary/20 hover:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div
                className={cn('p-4 border-t border-border', collapsed ? 'flex justify-center' : 'flex justify-between')}
            >
                {!collapsed ? (
                    <>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onClearSessions}
                            className="h-9 w-9 bg-grok-input border-secondary/30 hover:bg-secondary/20"
                            title="Clear all chats"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Clear all chats</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleCollapse}
                            className="h-9 w-9 bg-grok-input border-secondary/30 hover:bg-secondary/20"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Collapse sidebar</span>
                        </Button>
                    </>
                ) : (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={toggleCollapse}
                                    className="h-9 w-9 bg-grok-input border-secondary/30 hover:bg-secondary/20"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p className="text-xs">Expand sidebar</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}
