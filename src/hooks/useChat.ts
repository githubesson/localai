import { useCallback, useReducer, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from '@/lib/utils';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    isLoading?: boolean;
    error?: string;
    tokenCount?: number;
    tokensPerSecond?: number;
    generationTimeSeconds?: number;
}

export interface ChatSession {
    id: string;
    title: string;
    model: string;
    messages: ChatMessage[];
    createdAt: Date;
    systemPrompt?: string;
}

type ChatState = {
    sessions: ChatSession[];
    currentSessionId: string | null;
};

type ChatAction =
    | { type: 'SET_CURRENT_SESSION_ID'; payload: string }
    | { type: 'ADD_SESSION'; payload: ChatSession }
    | { type: 'DELETE_SESSION'; payload: string }
    | { type: 'CLEAR_SESSIONS' }
    | { type: 'ADD_MESSAGE'; payload: { sessionId: string; message: ChatMessage } }
    | { type: 'UPDATE_MESSAGE'; payload: { sessionId: string; messageId: string; updates: Partial<ChatMessage> } }
    | { type: 'UPDATE_SYSTEM_PROMPT'; payload: { sessionId: string; systemPrompt: string } }
    | { type: 'LOAD_SESSIONS'; payload: ChatState };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
    let newState: ChatState;

    switch (action.type) {
        case 'SET_CURRENT_SESSION_ID':
            newState = { ...state, currentSessionId: action.payload };
            break;
        case 'ADD_SESSION':
            newState = {
                ...state,
                sessions: [action.payload, ...state.sessions],
                currentSessionId: action.payload.id,
            };
            break;
        case 'DELETE_SESSION': {
            const newSessions = state.sessions.filter((session) => session.id !== action.payload);
            const newCurrentSessionId =
                state.currentSessionId === action.payload
                    ? newSessions.length > 0
                        ? newSessions[0].id
                        : null
                    : state.currentSessionId;
            newState = {
                ...state,
                sessions: newSessions,
                currentSessionId: newCurrentSessionId,
            };
            break;
        }
        case 'CLEAR_SESSIONS':
            newState = { sessions: [], currentSessionId: null };
            break;
        case 'ADD_MESSAGE': {
            newState = {
                ...state,
                sessions: state.sessions.map((session) =>
                    session.id === action.payload.sessionId
                        ? {
                              ...session,
                              messages: [...session.messages, action.payload.message],
                          }
                        : session
                ),
            };
            break;
        }
        case 'UPDATE_MESSAGE': {
            newState = {
                ...state,
                sessions: state.sessions.map((session) =>
                    session.id === action.payload.sessionId
                        ? {
                              ...session,
                              messages: session.messages.map((message) =>
                                  message.id === action.payload.messageId
                                      ? { ...message, ...action.payload.updates }
                                      : message
                              ),
                          }
                        : session
                ),
            };
            break;
        }
        case 'UPDATE_SYSTEM_PROMPT': {
            newState = {
                ...state,
                sessions: state.sessions.map((session) =>
                    session.id === action.payload.sessionId
                        ? {
                              ...session,
                              systemPrompt: action.payload.systemPrompt,
                          }
                        : session
                ),
            };
            break;
        }
        case 'LOAD_SESSIONS': {
            newState = action.payload;
            break;
        }
        default:
            return state;
    }

    localStorage.setItem('localai-chat-sessions', JSON.stringify(newState));
    return newState;
}

export interface AIModel {
    id: string;
    name: string;
    maxTokens?: number;
}

let abortController: AbortController | null = null;

export function useChat(baseUrl: string = 'http://localhost:8000') {
    const initialState: ChatState = {
        sessions: [],
        currentSessionId: null,
    };

    const [state, dispatch] = useReducer(chatReducer, initialState);

    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const savedSessions = localStorage.getItem('localai-chat-sessions');
            if (savedSessions) {
                const parsedSessions = JSON.parse(savedSessions);

                if (parsedSessions.sessions && Array.isArray(parsedSessions.sessions)) {
                    parsedSessions.sessions = parsedSessions.sessions.map((session: any) => ({
                        ...session,
                        createdAt: new Date(session.createdAt),
                    }));
                }

                dispatch({ type: 'LOAD_SESSIONS', payload: parsedSessions });
                setSessionsLoaded(true);
            } else {
                setSessionsLoaded(true);
            }
        } catch (error) {
            console.error('Error loading sessions from localStorage:', error);
            setSessionsLoaded(true);
        }
    }, []);

    const getLastSelectedModel = useCallback(() => {
        return localStorage.getItem('localai-last-model') || '';
    }, []);

    const saveSelectedModel = useCallback((modelId: string) => {
        localStorage.setItem('localai-last-model', modelId);
    }, []);

    const fetchModels = useCallback(async () => {
        setIsLoadingModels(true);
        try {
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const modelData = result.data || [];

            const modelGroups: Record<string, any[]> = {};

            modelData.forEach((model: any) => {
                const baseName = model.id.split('@')[0];
                if (!modelGroups[baseName]) {
                    modelGroups[baseName] = [];
                }
                modelGroups[baseName].push(model);
            });

            const fetchedModels: AIModel[] = [];

            Object.entries(modelGroups).forEach(([baseName, models]) => {
                models.forEach((model) => {
                    const quantInfo = model.id.includes('@') ? model.id.split('@')[1] : '';

                    let displayName = baseName.split('/').pop()?.replace(/-/g, ' ') || baseName;

                    if (models.length > 1 && quantInfo) {
                        displayName += ` (${quantInfo})`;
                    }

                    fetchedModels.push({
                        id: model.id,
                        name: displayName,
                    });
                });
            });

            fetchedModels.sort((a, b) => a.name.localeCompare(b.name));

            setModels(fetchedModels);
            return fetchedModels;
        } catch (error) {
            console.error('Error fetching models:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching models',
                description: 'Could not fetch available models.',
            });
            return [];
        } finally {
            setIsLoadingModels(false);
        }
    }, [toast, baseUrl]);

    const createNewSession = useCallback(
        (modelId: string) => {
            const now = new Date();
            const defaultSystemPrompt = localStorage.getItem('localai-system-prompt') || '';

            const session: ChatSession = {
                id: nanoid(),
                title: `Chat ${now.toLocaleTimeString()}`,
                model: modelId,
                messages: [],
                createdAt: now,
                systemPrompt: defaultSystemPrompt,
            };

            saveSelectedModel(modelId);

            dispatch({ type: 'ADD_SESSION', payload: session });
            return session;
        },
        [saveSelectedModel]
    );

    const setCurrentSessionId = useCallback((sessionId: string) => {
        dispatch({ type: 'SET_CURRENT_SESSION_ID', payload: sessionId });
    }, []);

    const deleteSession = useCallback((sessionId: string) => {
        dispatch({ type: 'DELETE_SESSION', payload: sessionId });
    }, []);

    const clearAllSessions = useCallback(() => {
        dispatch({ type: 'CLEAR_SESSIONS' });
    }, []);

    const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
        dispatch({
            type: 'ADD_MESSAGE',
            payload: { sessionId, message },
        });
    }, []);

    const updateMessage = useCallback((sessionId: string, messageId: string, updates: Partial<ChatMessage>) => {
        dispatch({
            type: 'UPDATE_MESSAGE',
            payload: { sessionId, messageId, updates },
        });
    }, []);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!state.currentSessionId) return;

            setIsSending(true);
            const userMessageId = nanoid();
            addMessage(state.currentSessionId, {
                id: userMessageId,
                role: 'user',
                content,
            });

            const assistantMessageId = nanoid();
            addMessage(state.currentSessionId, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                isLoading: true,
            });

            const currentSession = state.sessions.find((s) => s.id === state.currentSessionId);
            if (!currentSession) {
                setIsSending(false);
                return;
            }

            try {
                setIsGenerating(true);
                const messages = currentSession.messages
                    .filter((m) => !m.isLoading)
                    .map(({ role, content }) => ({ role, content }));

                if (currentSession.systemPrompt) {
                    messages.unshift({ role: 'system', content: currentSession.systemPrompt });
                }

                messages.push({ role: 'user', content });

                abortController = new AbortController();
                const { signal } = abortController;

                const startTime = Date.now();
                let tokenCount = 0;

                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: currentSession.model,
                        messages,
                        stream: true,
                    }),
                    signal,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Cannot read from response stream');
                }

                const decoder = new TextDecoder();
                let buffer = '';
                let fullContent = '';
                let inThinkingMode = false;
                let thinkingContent = '';
                let hasThinkingTag = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.trim() === 'data: [DONE]') continue;

                        try {
                            const parsedLine = line.startsWith('data: ') ? line.slice(6) : line;

                            const parsed = JSON.parse(parsedLine);
                            const content = parsed.choices?.[0]?.delta?.content || '';

                            if (content) {
                                tokenCount += Math.ceil(content.length / 4);

                                const elapsedTimeSeconds = (Date.now() - startTime) / 1000;
                                const tokensPerSecond = tokenCount / elapsedTimeSeconds;

                                if (content.includes('<think>')) {
                                    inThinkingMode = true;
                                    hasThinkingTag = true;
                                    const parts = content.split('<think>');
                                    fullContent += parts[0];
                                    thinkingContent = parts[1] || '';

                                    fullContent += '<think>';
                                } else if (content.includes('</think>')) {
                                    inThinkingMode = false;
                                    const parts = content.split('</think>');
                                    thinkingContent += parts[0];

                                    const thinkStart = fullContent.indexOf('<think>');
                                    if (thinkStart !== -1) {
                                        fullContent =
                                            fullContent.substring(0, thinkStart + 7) +
                                            thinkingContent +
                                            '</think>' +
                                            (parts[1] || '');
                                    } else {
                                        fullContent += thinkingContent + '</think>' + (parts[1] || '');
                                    }
                                } else if (inThinkingMode) {
                                    thinkingContent += content;

                                    const thinkStart = fullContent.indexOf('<think>');
                                    if (thinkStart !== -1) {
                                        fullContent = fullContent.substring(0, thinkStart + 7) + thinkingContent;
                                    }
                                } else {
                                    fullContent += content;
                                }

                                updateMessage(state.currentSessionId!, assistantMessageId, {
                                    content: fullContent,
                                    tokenCount: tokenCount,
                                    tokensPerSecond: parseFloat(tokensPerSecond.toFixed(2)),
                                    generationTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(2)),
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing streaming response:', e, 'Line:', line);
                        }
                    }
                }

                if (inThinkingMode && hasThinkingTag) {
                    const thinkStart = fullContent.indexOf('<think>');
                    if (thinkStart !== -1) {
                        fullContent = fullContent.substring(0, thinkStart + 7) + thinkingContent + '</think>';
                    } else {
                        fullContent += '</think>';
                    }

                    updateMessage(state.currentSessionId!, assistantMessageId, {
                        content: fullContent,
                    });
                }

                const finalElapsedTimeSeconds = (Date.now() - startTime) / 1000;
                const finalTokensPerSecond = tokenCount / finalElapsedTimeSeconds;

                updateMessage(state.currentSessionId!, assistantMessageId, {
                    isLoading: false,
                    tokenCount: tokenCount,
                    tokensPerSecond: parseFloat(finalTokensPerSecond.toFixed(2)),
                    generationTimeSeconds: parseFloat(finalElapsedTimeSeconds.toFixed(2)),
                });
            } catch (error) {
                console.error('Error sending message:', error);

                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('Request was aborted');
                } else {
                    updateMessage(state.currentSessionId, assistantMessageId, {
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        content: 'Error: Unable to communicate with AI service.',
                    });
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Failed to send message. Please try again.',
                    });
                }
            } finally {
                setIsGenerating(false);
                setIsSending(false);
                abortController = null;
            }
        },
        [state.currentSessionId, state.sessions, addMessage, updateMessage, toast, baseUrl]
    );

    const stopGenerating = useCallback(() => {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        setIsGenerating(false);
    }, []);

    const exportChats = useCallback(() => {
        try {
            const chatData = JSON.stringify(state, null, 2);
            const blob = new Blob([chatData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `localai-chats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting chats:', error);
            return false;
        }
    }, [state]);

    const importChats = useCallback((jsonData: string) => {
        try {
            const parsedData = JSON.parse(jsonData);

            if (!parsedData.sessions || !Array.isArray(parsedData.sessions)) {
                throw new Error('Invalid chat data format');
            }

            parsedData.sessions = parsedData.sessions.map((session: any) => ({
                ...session,
                createdAt: new Date(session.createdAt),
            }));

            dispatch({ type: 'LOAD_SESSIONS', payload: parsedData });
            return true;
        } catch (error) {
            console.error('Error importing chats:', error);
            return false;
        }
    }, []);

    const currentSession = state.currentSessionId ? state.sessions.find((s) => s.id === state.currentSessionId) : null;

    const getDefaultSystemPrompt = useCallback(() => {
        return localStorage.getItem('localai-system-prompt') || '';
    }, []);

    const saveDefaultSystemPrompt = useCallback((systemPrompt: string) => {
        localStorage.setItem('localai-system-prompt', systemPrompt);

        const event = new CustomEvent('system-prompt-change', {
            detail: { systemPrompt },
        });
        window.dispatchEvent(event);
    }, []);

    const updateSystemPrompt = useCallback((sessionId: string, systemPrompt: string) => {
        dispatch({
            type: 'UPDATE_SYSTEM_PROMPT',
            payload: { sessionId, systemPrompt },
        });
    }, []);

    return {
        sessions: state.sessions,
        currentSession,
        currentSessionId: state.currentSessionId,
        models,
        isLoadingModels,
        isGenerating,
        isSending,
        sessionsLoaded,
        fetchModels,
        createNewSession,
        setCurrentSessionId,
        deleteSession,
        clearAllSessions,
        sendMessage,
        stopGenerating,
        getLastSelectedModel,
        saveSelectedModel,
        exportChats,
        importChats,
        getDefaultSystemPrompt,
        saveDefaultSystemPrompt,
        updateSystemPrompt,
    };
}
