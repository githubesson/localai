import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ChatSidebar } from '../components/ChatSidebar';
import { ModelSelector } from '../components/ModelSelector';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, BotMessageSquare, Sigma } from 'lucide-react';
import { createLocalStorageListener } from '../lib/utils';
import pdfToText from 'react-pdftotext';

const extractText = async (file: File): Promise<string> => {
    try {
        return await pdfToText(file);
    } catch (err) {
        console.error('Error extracting text from PDF:', err);

        throw new Error(`Could not extract text from ${file.name}`);
    }
};

const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result as string);
        };

        reader.onerror = (error) => {
            reject(new Error(`Failed to read file: ${error}`));
        };

        reader.readAsText(file);
    });
};

const formatFileContent = (fileName: string, fileContent: string): string => {
    return `<file name="${fileName}">\n${fileContent}\n</file name="${fileName}">`;
};

export default function Chat() {
    const [apiUrl, setApiUrl] = useState(localStorage.getItem('localai-api-url') || 'http://localhost:8000');
    const { toast } = useToast();
    const [autoScroll, setAutoScroll] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const lastUserInteractionRef = useRef<number>(Date.now());

    useEffect(() => {
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed) {
            setSidebarCollapsed(savedCollapsed === 'true');
        }

        const handleCustomEvent = (e: CustomEvent) => {
            setSidebarCollapsed(e.detail.collapsed);
        };

        window.addEventListener('sidebar-collapse-change', handleCustomEvent as EventListener);
        const cleanupStorage = createLocalStorageListener('sidebar-collapsed', (newValue) =>
            setSidebarCollapsed(newValue === 'true')
        );

        return () => {
            window.removeEventListener('sidebar-collapse-change', handleCustomEvent as EventListener);
            cleanupStorage();
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('localai-api-url', apiUrl);
    }, [apiUrl]);

    const {
        sessions,
        currentSession,
        currentSessionId,
        models,
        isLoadingModels,
        isGenerating,
        sendMessage,
        isSending,
        fetchModels,
        createNewSession,
        setCurrentSessionId,
        stopGenerating,
        deleteSession,
        clearAllSessions,
        getLastSelectedModel,
        saveSelectedModel,
        sessionsLoaded,
        updateSystemPrompt,
        getDefaultSystemPrompt,
    } = useChat(apiUrl);

    const [lastDefaultSystemPrompt, setLastDefaultSystemPrompt] = useState<string>('');

    useEffect(() => {
        setLastDefaultSystemPrompt(getDefaultSystemPrompt());
    }, [getDefaultSystemPrompt]);

    useEffect(() => {
        const updateEmptySessionPrompt = (newPrompt: string) => {
            if (
                newPrompt !== lastDefaultSystemPrompt &&
                currentSession &&
                currentSessionId &&
                currentSession.messages.length === 0 &&
                currentSession.systemPrompt !== newPrompt
            ) {
                setLastDefaultSystemPrompt(newPrompt);
                updateSystemPrompt(currentSessionId, newPrompt);
            }
        };

        const currentDefaultPrompt = getDefaultSystemPrompt();
        if (currentDefaultPrompt !== lastDefaultSystemPrompt) {
            updateEmptySessionPrompt(currentDefaultPrompt);
        }

        const handleCustomEvent = (e: CustomEvent<{ systemPrompt: string }>) => {
            updateEmptySessionPrompt(e.detail.systemPrompt);
        };

        window.addEventListener('system-prompt-change', handleCustomEvent as EventListener);
        const cleanupStorage = createLocalStorageListener('localai-system-prompt', (newValue) =>
            updateEmptySessionPrompt(newValue || '')
        );

        const checkInterval = setInterval(() => {
            const latestPrompt = getDefaultSystemPrompt();
            if (latestPrompt !== lastDefaultSystemPrompt) {
                updateEmptySessionPrompt(latestPrompt);
            }
        }, 1000);

        return () => {
            clearInterval(checkInterval);
            window.removeEventListener('system-prompt-change', handleCustomEvent as EventListener);
            cleanupStorage();
        };
    }, [currentSession, currentSessionId, getDefaultSystemPrompt, updateSystemPrompt, lastDefaultSystemPrompt]);

    useEffect(() => {
        if (currentSession && currentSessionId && currentSession.messages.length === 0) {
            const currentDefaultPrompt = getDefaultSystemPrompt();

            if (currentSession.systemPrompt !== currentDefaultPrompt) {
                updateSystemPrompt(currentSessionId, currentDefaultPrompt);
            }
        }
    }, [currentSessionId, getDefaultSystemPrompt, updateSystemPrompt]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    const handleScroll = () => {
        if (!scrollAreaRef.current) return;

        lastUserInteractionRef.current = Date.now();

        const scrollElement = scrollAreaRef.current;
        const isScrolledToBottom =
            scrollElement.scrollHeight - scrollElement.scrollTop <= scrollElement.clientHeight + 100;

        setAutoScroll(isScrolledToBottom);
    };

    useEffect(() => {
        if (!modelsLoaded) {
            fetchModels()
                .then((fetchedModels) => {
                    if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                        setModelsLoaded(true);
                    }
                })
                .catch((error) => {
                    console.error('Error fetching models:', error);
                    toast({
                        variant: 'destructive',
                        title: 'Error fetching models',
                        description: 'Could not fetch available models. Please check your API connection.',
                    });
                });
        }
    }, [fetchModels, toast, modelsLoaded]);

    useEffect(() => {
        if (!sessionsLoaded || !modelsLoaded) return;

        if (sessions.length > 0 && !currentSessionId) {
            const sortedSessions = [...sessions].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setCurrentSessionId(sortedSessions[0].id);
        } else if (sessions.length === 0 && !currentSessionId) {
            const lastSelectedModel = getLastSelectedModel();

            const availableModels = models || [];
            const modelToUse =
                lastSelectedModel && availableModels.some((model) => model.id === lastSelectedModel)
                    ? lastSelectedModel
                    : availableModels.length > 0
                      ? availableModels[0].id
                      : '';

            if (modelToUse) {
                createNewSession(modelToUse);
            }
        }
    }, [
        sessionsLoaded,
        modelsLoaded,
        sessions,
        currentSessionId,
        models,
        setCurrentSessionId,
        getLastSelectedModel,
        createNewSession,
    ]);

    useEffect(() => {
        const shouldAutoScroll = autoScroll && Date.now() - lastUserInteractionRef.current > 500;

        if (messagesEndRef.current && shouldAutoScroll) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentSession?.messages, autoScroll]);

    useEffect(() => {
        if (isGenerating) {
            setAutoScroll(true);
        }
    }, [isGenerating]);

    const handleCreateNewSession = () => {
        if (Array.isArray(models) && models.length > 0) {
            const lastSelectedModel = getLastSelectedModel();

            const modelToUse =
                lastSelectedModel && models.some((model) => model.id === lastSelectedModel)
                    ? lastSelectedModel
                    : models[0].id;

            createNewSession(modelToUse);
        } else {
            toast({
                variant: 'destructive',
                title: 'No models available',
                description: 'Please wait for models to load or check your API connection.',
            });
        }
    };

    const handleSelectModel = (modelId: string) => {
        saveSelectedModel(modelId);

        if (currentSessionId && currentSession?.messages.length === 0) {
            deleteSession(currentSessionId);
        }
        createNewSession(modelId);
    };

    const handleSendMessage = async (content: string, attachedFiles?: File[]): Promise<void> => {
        setAutoScroll(true);

        if (!attachedFiles || attachedFiles.length === 0) {
            sendMessage(content);

            return;
        }

        try {
            const filePromises = attachedFiles.map(async (file) => {
                let fileContent: string;

                if (file.type === 'application/pdf') {
                    fileContent = await extractText(file);
                } else {
                    fileContent = await readFileContent(file);
                }

                return formatFileContent(file.name, fileContent);
            });

            const formattedFiles = await Promise.all(filePromises);
            const fullMessage = [...formattedFiles, content].filter(Boolean).join('\n');

            sendMessage(fullMessage);
        } catch (err) {
            console.error(`Error processing files: ${err}`);

            toast({
                variant: 'destructive',
                title: 'Error processing files',
                description: `Could not process attached files: ${err}`,
            });

            sendMessage(content);
        }
    };

    const calculateTotalTokens = () => {
        if (!currentSession) return 0;

        return currentSession.messages.reduce((total, message) => {
            return total + (message.tokenCount || 0);
        }, 0);
    };

    const totalTokens = calculateTotalTokens();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-grok-darker">
            <ChatSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
                onCreateSession={handleCreateNewSession}
                onDeleteSession={deleteSession}
                onClearSessions={clearAllSessions}
            />

            <div className="flex flex-col flex-1 h-full overflow-hidden">
                <header className="h-14 border-b border-border flex items-center justify-between px-4">
                    <h1 className="text-xl font-semibold">Local AI</h1>
                    <div className="flex items-center gap-2">
                        {currentSession?.systemPrompt && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-md flex items-center h-9"
                                onClick={() => document.getElementById('settings-trigger')?.click()}
                            >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                <span className="mr-1">System Prompt:</span>
                                <span className="truncate max-w-[150px]">{currentSession.systemPrompt}</span>
                            </Button>
                        )}
                        {totalTokens > 0 && currentSession && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-secondary/30 px-2 py-1 rounded-md h-9">
                                <Sigma className="h-3 w-3" />
                                <span>{totalTokens} tokens</span>
                            </div>
                        )}
                        <ModelSelector
                            models={models}
                            selectedModel={currentSession?.model || ''}
                            onSelectModel={handleSelectModel}
                            isLoading={isLoadingModels}
                            disabled={isSending || isGenerating}
                        />
                        <SettingsDialog apiUrl={apiUrl} onApiUrlChange={setApiUrl} />
                    </div>
                </header>

                {currentSession ? (
                    <>
                        <div className="flex-1 pt-4 overflow-y-auto" ref={scrollAreaRef} onScroll={handleScroll}>
                            {currentSession.messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full pb-20">
                                    <div className="max-w-lg text-center space-y-4">
                                        <BotMessageSquare className="h-20 w-20 mx-auto mb-4" />
                                        <h2 className="text-3xl font-bold">Welcome to Local AI</h2>
                                        <p className="text-xl text-muted-foreground">
                                            Your local AI assistant. How can I help you today?
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="pb-32">
                                    {/* Display system message if it exists */}
                                    {currentSession.systemPrompt && currentSession.messages.length > 0 && (
                                        <ChatMessage
                                            key="system-message"
                                            message={{
                                                id: 'system-message',
                                                role: 'system',
                                                content: currentSession.systemPrompt,
                                            }}
                                        />
                                    )}
                                    {currentSession.messages.map((message) => (
                                        <ChatMessage key={message.id} message={message} />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        <div
                            className={`absolute bottom-0 right-0 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-64'}`}
                        >
                            <div className="dark-gradient py-4 px-4 w-full">
                                <ChatInput
                                    onSendMessage={handleSendMessage}
                                    onStopGenerating={stopGenerating}
                                    isGenerating={isGenerating}
                                    disabled={!currentSessionId}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-muted-foreground">Create a new chat to get started.</p>
                        <Button className="mt-4 bg-grok-input hover:bg-grok-input/90" onClick={handleCreateNewSession}>
                            New Chat
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
