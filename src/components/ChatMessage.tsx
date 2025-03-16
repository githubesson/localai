import { ChatMessage as ChatMessageType } from '../hooks/useChat';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { CircleDashed, ChevronDown, BrainCog, User, Bot, MessageSquare, Paperclip } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatMessageProps {
    message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const [copiedBlocks, setCopiedBlocks] = useState<Record<string, boolean>>({});
    const [showThinking, setShowThinking] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);

    const hasThinking =
        !isUser && !isSystem && message.content.includes('<think>') && message.content.includes('</think>');
    let thinkingContent = '';
    let mainContent = message.content;

    if (hasThinking) {
        const thinkStart = message.content.indexOf('<think>');
        const thinkEnd = message.content.indexOf('</think>');

        if (thinkStart !== -1 && thinkEnd !== -1 && thinkEnd > thinkStart) {
            thinkingContent = message.content.substring(thinkStart + 7, thinkEnd).trim();
            mainContent = message.content.substring(0, thinkStart) + message.content.substring(thinkEnd + 8).trim();
        }
    } else if (!isUser && !isSystem && message.content.includes('<think>')) {
        const thinkStart = message.content.indexOf('<think>');
        if (thinkStart !== -1) {
            thinkingContent = message.content.substring(thinkStart + 7).trim();
            mainContent = message.content.substring(0, thinkStart).trim();
        }
    }

    const hasFileAttachment = isUser && mainContent.includes('[Attached ');
    let messageText = mainContent;
    let fileAttachmentText = '';

    if (hasFileAttachment) {
        const attachmentStart = mainContent.indexOf('[Attached ');
        if (attachmentStart !== -1) {
            const attachmentEnd = mainContent.indexOf(']', attachmentStart);
            if (attachmentEnd !== -1) {
                fileAttachmentText = mainContent.substring(attachmentStart, attachmentEnd + 1).trim();
                messageText = mainContent.substring(0, attachmentStart).trim();
            }
        }
    }

    useEffect(() => {
        if (!messageRef.current) return;

        const style = document.createElement('style');
        style.textContent = `
      .prose pre {
        position: relative;
        background-color: #1e1e1e;
        border-radius: 0.375rem;
        padding: 1rem;
        margin: 1rem 0;
        overflow-x: auto;
      }
      .prose code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.875rem;
        line-height: 1.5;
      }
      .prose pre code {
        color: #e2e8f0;
        background-color: transparent;
        padding: 0;
        border-radius: 0;
      }
      .prose :not(pre) > code {
        background-color: rgba(255, 255, 255, 0.1);
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        font-size: 0.875em;
      }
      .prose p {
        margin-bottom: 1rem;
        line-height: 1.7;
      }
      .prose ul, .prose ol {
        margin-top: 0.75rem;
        margin-bottom: 0.75rem;
        padding-left: 1.5rem;
      }
      .prose li {
        margin-bottom: 0.5rem;
      }
      .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
        margin-top: 1.5rem;
        margin-bottom: 1rem;
      }
      .prose blockquote {
        padding-left: 1rem;
        border-left: 3px solid rgba(255, 255, 255, 0.2);
        margin: 1rem 0;
      }
      .thinking-box {
        background-color: rgba(24, 24, 27, 0.6);
        border: 1px solid rgba(63, 63, 70, 0.4);
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      .thinking-header {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #a1a1aa;
        background-color: rgba(39, 39, 42, 0.6);
        transition: all 0.2s ease;
      }
      .thinking-header:hover {
        background-color: rgba(39, 39, 42, 0.8);
      }
      .thinking-content {
        font-size: 0.875rem;
        color: #d4d4d8;
        padding: 0.75rem;
        border-top: 1px solid rgba(63, 63, 70, 0.4);
        background-color: rgba(24, 24, 27, 0.4);
      }
      .thinking-icon {
        margin-right: 0.5rem;
        opacity: 0.7;
      }
      .thinking-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .thinking-label-text {
        font-weight: 500;
      }
      .thinking-toggle {
        margin-left: auto;
        transition: transform 0.2s ease;
      }
      .thinking-toggle.open {
        transform: rotate(180deg);
      }
    `;
        document.head.appendChild(style);

        const codeBlocks = messageRef.current.querySelectorAll('pre code');

        codeBlocks.forEach((codeBlock, index) => {
            const id = `code-${message.id}-${index}`;
            const pre = codeBlock.parentElement;

            if (!pre || pre.querySelector('.copy-button')) return;

            const copyButton = document.createElement('button');
            copyButton.className =
                'copy-button absolute top-2 right-2 p-1 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors';
            copyButton.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

            copyButton.addEventListener('click', () => {
                const code = codeBlock.textContent || '';
                navigator.clipboard.writeText(code);

                copyButton.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>';

                setTimeout(() => {
                    copyButton.innerHTML =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 2000);
            });

            pre.appendChild(copyButton);
        });

        return () => {
            document.head.removeChild(style);
        };
    }, [message.content, message.id, hasThinking]);

    const showThinkingSection = !isUser && !isSystem && (hasThinking || message.content.includes('<think>'));

    if (isSystem) {
        return (
            <div className="py-3 px-4 flex items-start gap-4 bg-primary/10 border-l-2 border-primary">
                <Avatar className="h-8 w-8 rounded-md flex items-center justify-center bg-primary/20 ring-2 ring-primary/20">
                    <MessageSquare className="h-4 w-4 text-primary" />
                </Avatar>
                <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="text-sm font-medium text-primary">System</div>
                    <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('py-6 px-4 flex items-start gap-4', isUser ? 'bg-transparent' : 'bg-secondary/20')}>
            <Avatar
                className={cn(
                    'h-8 w-8 rounded-md flex items-center justify-center',
                    isUser ? 'bg-primary/90 ring-2 ring-primary/20' : 'bg-muted/90 ring-2 ring-muted/30'
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                )}
            </Avatar>

            <div className="flex-1 space-y-2 overflow-hidden">
                <div className="text-sm font-medium">{isUser ? 'You' : 'AI Assistant'}</div>

                <div className="prose prose-invert max-w-none" ref={messageRef}>
                    {message.isLoading ? (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <CircleDashed className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground">Generating response...</span>
                            </div>

                            {showThinkingSection && thinkingContent && (
                                <div className="thinking-box">
                                    <div className="thinking-header" onClick={() => setShowThinking(!showThinking)}>
                                        <div className="thinking-label">
                                            <BrainCog className="h-4 w-4 thinking-icon" />
                                            <span className="thinking-label-text">Thinking process</span>
                                        </div>
                                        <div className={`thinking-toggle ${showThinking ? 'open' : ''}`}>
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                    {showThinking && (
                                        <div className="thinking-content">
                                            <ReactMarkdown>{thinkingContent}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {messageText && <ReactMarkdown>{messageText}</ReactMarkdown>}

                            {hasFileAttachment && (
                                <div className="mt-2 flex items-center text-xs bg-primary/10 rounded-md px-3 py-2 border border-primary/20">
                                    <Paperclip className="h-4 w-4 mr-2 text-primary/70" />
                                    <span className="text-primary/90 font-medium">{fileAttachmentText}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {showThinkingSection && (
                                <div className="thinking-box">
                                    <div className="thinking-header" onClick={() => setShowThinking(!showThinking)}>
                                        <div className="thinking-label">
                                            <BrainCog className="h-4 w-4 thinking-icon" />
                                            <span className="thinking-label-text">Thinking process</span>
                                        </div>
                                        <div className={`thinking-toggle ${showThinking ? 'open' : ''}`}>
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                    {showThinking && (
                                        <div className="thinking-content">
                                            <ReactMarkdown>{thinkingContent}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}
                            <ReactMarkdown>{messageText}</ReactMarkdown>

                            {hasFileAttachment && (
                                <div className="mt-2 flex items-center text-xs bg-primary/10 rounded-md px-3 py-2 border border-primary/20">
                                    <Paperclip className="h-4 w-4 mr-2 text-primary/70" />
                                    <span className="text-primary/90 font-medium">{fileAttachmentText}</span>
                                </div>
                            )}

                            {/* Token statistics - only show for assistant messages */}
                            {!isUser && !isSystem && message.tokenCount && (
                                <div className="mt-3 flex items-center text-xs text-muted-foreground/70 border-t border-border/40 pt-2">
                                    <div className="flex gap-4">
                                        <span>{message.tokenCount} tokens</span>
                                        {message.tokensPerSecond && <span>{message.tokensPerSecond} tokens/sec</span>}
                                        {message.generationTimeSeconds && (
                                            <span>{message.generationTimeSeconds}s generation time</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
