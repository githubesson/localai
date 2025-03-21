import { ChatMessage as ChatMessageType, FILE_SYSTEM_PROMPT } from '../hooks/useChat';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import {
    CircleDashed,
    ChevronDown,
    BrainCog,
    User,
    Bot,
    MessageSquare,
    Paperclip,
    Copy,
    Check,
    RefreshCw,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatMessageProps {
    message: ChatMessageType;
    onRetry?: (messageId: string) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const [showThinking, setShowThinking] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);
    const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
    const [cleanContent, setCleanContent] = useState<string>(message.content);
    const [isCopied, setIsCopied] = useState(false);

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

    const removeFileSections = (content: string): { cleanContent: string; extractedFiles: string[] } => {
        let result = content;
        const fileStartRegex = /<file name="[^"]*">/g;
        let match: RegExpExecArray | null;
        const extractedFiles: string[] = [];

        while ((match = fileStartRegex.exec(result)) !== null) {
            const startIdx = match.index;
            const startTag = match[0];
            const fileName = startTag.match(/"([^"]*)"/)?.[1] || '';

            if (fileName) {
                extractedFiles.push(fileName);
            }

            const endTag = `</file name="${fileName}">`;
            const endIdx = result.indexOf(endTag, startIdx + startTag.length);

            if (endIdx !== -1) {
                result = result.substring(0, startIdx) + result.substring(endIdx + endTag.length);

                fileStartRegex.lastIndex = 0;
            }
        }

        return { cleanContent: result.trim(), extractedFiles };
    };

    useEffect(() => {
        const result = removeFileSections(mainContent);
        setCleanContent(result.cleanContent);
        if (result.extractedFiles.length > 0) {
            setAttachedFiles(result.extractedFiles);
        }
    }, [mainContent]);

    const hasFileAttachment = isUser && cleanContent.includes('[Attached ');
    let messageText = cleanContent;
    let fileAttachmentText = '';

    if (hasFileAttachment) {
        const attachmentStart = cleanContent.indexOf('[Attached ');
        if (attachmentStart !== -1) {
            const attachmentEnd = cleanContent.indexOf(']', attachmentStart);
            if (attachmentEnd !== -1) {
                fileAttachmentText = cleanContent.substring(attachmentStart, attachmentEnd + 1).trim();
                messageText = cleanContent.substring(0, attachmentStart).trim();
            }
        }
    }

    const FileAttachmentsIndicator = () => {
        if (attachedFiles.length === 0) return null;

        return (
            <div className="mt-3 flex flex-col text-xs bg-secondary/30 rounded-md overflow-hidden border border-border/40">
                <div className="flex items-center px-3 py-2 bg-secondary/50">
                    <Paperclip className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">
                        {attachedFiles.length} {attachedFiles.length === 1 ? 'file' : 'files'} attached
                    </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-background/20">
                    {attachedFiles.map((fileName, index) => (
                        <div
                            key={index}
                            className="flex items-center bg-secondary/40 px-2 py-1 rounded text-xs text-muted-foreground/90 border border-border/30"
                        >
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/50 mr-1.5"></div>
                            {fileName}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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
      .prose pre::-webkit-scrollbar {
        height: 8px;
      }
      .prose pre::-webkit-scrollbar-track {
        background: #121212;
      }
      .prose pre::-webkit-scrollbar-thumb {
        background: #262626;
        border-radius: 4px;
      }
      .prose pre::-webkit-scrollbar-thumb:hover {
        background: #333;
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
        max-height: 400px;
        overflow-y: auto;
      }
      .thinking-content::-webkit-scrollbar {
        width: 8px;
      }
      .thinking-content::-webkit-scrollbar-track {
        background: #121212;
      }
      .thinking-content::-webkit-scrollbar-thumb {
        background: #262626;
        border-radius: 4px;
      }
      .thinking-content::-webkit-scrollbar-thumb:hover {
        background: #333;
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

        codeBlocks.forEach((codeBlock) => {
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

    const handleCopyMessage = () => {
        if (isSystem && message.content === '📎 File system prompt enabled') {
            navigator.clipboard.writeText(FILE_SYSTEM_PROMPT);
        } else {
            navigator.clipboard.writeText(messageText);
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleRetry = () => {
        if (onRetry) {
            onRetry(message.id);
        }
    };

    if (isSystem) {
        const isFileSystemPrompt = message.content === '📎 File system prompt enabled';

        return (
            <div
                className={cn(
                    'py-3 px-4 flex items-start gap-4',
                    isFileSystemPrompt
                        ? 'bg-muted/30 border-l-2 border-muted-foreground/30'
                        : 'bg-primary/10 border-l-2 border-primary'
                )}
            >
                <Avatar
                    className={cn(
                        'h-8 w-8 rounded-md flex items-center justify-center',
                        isFileSystemPrompt ? 'bg-muted/50 ring-2 ring-muted/20' : 'bg-primary/20 ring-2 ring-primary/20'
                    )}
                >
                    {isFileSystemPrompt ? (
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <MessageSquare className="h-4 w-4 text-primary" />
                    )}
                </Avatar>
                <div className="flex-1 space-y-1 overflow-hidden">
                    <div
                        className={cn(
                            'text-sm font-medium flex items-center justify-between',
                            isFileSystemPrompt ? 'text-muted-foreground' : 'text-primary'
                        )}
                    >
                        <span>{isFileSystemPrompt ? 'File System' : 'System'}</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyMessage}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                title={isFileSystemPrompt ? 'Copy system prompt' : 'Copy message'}
                            >
                                {isCopied ? (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>{isFileSystemPrompt ? 'Copy prompt' : 'Copy'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="prose prose-invert max-w-none text-sm">
                        {isFileSystemPrompt ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>File system prompt enabled</span>
                            </div>
                        ) : (
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        )}
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
                <div className="text-sm font-medium flex items-center justify-between">
                    <span>{isUser ? 'You' : 'AI Assistant'}</span>
                    {!message.isLoading && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyMessage}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
                                title="Copy message"
                            >
                                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            {!isUser && !isSystem && onRetry && (
                                <button
                                    onClick={handleRetry}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
                                    title="Retry"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

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

                            {/* Show file attachments indicator */}
                            {isUser && attachedFiles.length > 0 && <FileAttachmentsIndicator />}
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

                            {/* Show file attachments indicator */}
                            {isUser && attachedFiles.length > 0 && <FileAttachmentsIndicator />}

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
