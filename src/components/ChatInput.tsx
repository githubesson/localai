import { useState, FormEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, StopCircle, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSendMessage: (message: string, attachedFiles?: File[]) => void;
    onStopGenerating: () => void;
    isGenerating: boolean;
    disabled?: boolean;
}

export function ChatInput({ onSendMessage, onStopGenerating, isGenerating, disabled = false }: ChatInputProps) {
    const [input, setInput] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if ((input.trim() || attachedFiles.length > 0) && !disabled) {
            onSendMessage(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
            setInput('');
            setAttachedFiles([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if ((input.trim() || attachedFiles.length > 0) && !disabled) {
                onSendMessage(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
                setInput('');
                setAttachedFiles([]);
            }
        }
    };

    const handleAttachClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachedFiles((prev) => [...prev, file]);
        }

        if (e.target.value) {
            e.target.value = '';
        }
    };

    const removeAttachedFile = (index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSubmit} className="relative px-4 py-4 space-y-4 bg-transparent">
            {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachedFiles.map((file, index) => (
                        <div key={index} className="bg-primary/10 text-sm rounded-md px-2 py-1 flex items-center gap-1">
                            <span className="truncate max-w-[200px]">
                                📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                                type="button"
                                onClick={() => removeAttachedFile(index)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="chat-input flex items-center p-2">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    onClick={handleAttachClick}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <Textarea
                    ref={textareaRef}
                    placeholder="Message Local AI..."
                    className={cn(
                        'flex-1 max-h-[200px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 py-2 px-2 min-h-[40px]',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isGenerating}
                    rows={1}
                />

                <Button
                    type={isGenerating ? 'button' : 'submit'}
                    size="icon"
                    className={cn(
                        'h-8 w-8 rounded-full ml-2 shrink-0',
                        isGenerating
                            ? 'bg-destructive hover:bg-destructive/90'
                            : input.trim() || attachedFiles.length > 0
                              ? 'bg-primary hover:bg-primary/90'
                              : 'text-muted-foreground bg-muted hover:bg-muted/90'
                    )}
                    onClick={isGenerating ? onStopGenerating : undefined}
                    disabled={!isGenerating && ((!input.trim() && attachedFiles.length === 0) || disabled)}
                >
                    {isGenerating ? <StopCircle className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">{isGenerating ? 'Stop generating' : 'Send message'}</span>
                </Button>
            </div>
        </form>
    );
}
