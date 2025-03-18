import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useChat } from '../hooks/useChat';
import { Textarea } from '@/components/ui/textarea';

interface SettingsDialogProps {
    apiUrl: string;
    onApiUrlChange: (url: string) => void;
}

export function SettingsDialog({ apiUrl, onApiUrlChange }: SettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [fileSystemPrompt, setFileSystemPrompt] = useState('');
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        exportChats,
        importChats,
        getDefaultSystemPrompt,
        saveDefaultSystemPrompt,
        updateSystemPrompt,
        currentSessionId,
        getFileSystemPrompt,
        saveFileSystemPrompt,
    } = useChat();

    useEffect(() => {
        if (open) {
            setSystemPrompt(getDefaultSystemPrompt());
            setFileSystemPrompt(getFileSystemPrompt());
        }
    }, [open, getDefaultSystemPrompt, getFileSystemPrompt]);

    const handleSave = () => {
        onApiUrlChange(localApiUrl);

        saveDefaultSystemPrompt(systemPrompt);
        saveFileSystemPrompt(fileSystemPrompt);

        if (currentSessionId) {
            updateSystemPrompt(currentSessionId, systemPrompt);
        }

        setOpen(false);
        toast({
            title: 'Settings saved',
            description: 'Your settings have been updated.',
        });
    };

    const handleExport = () => {
        const success = exportChats();
        if (success) {
            toast({
                title: 'Chats exported',
                description: 'Your chat history has been exported to a JSON file.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Export failed',
                description: 'There was an error exporting your chat history.',
            });
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const success = importChats(content);
                if (success) {
                    toast({
                        title: 'Chats imported',
                        description: 'Your chat history has been imported successfully.',
                    });
                    setOpen(false);

                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Import failed',
                        description: 'The file format is invalid or corrupted.',
                    });
                }
            }
        };
        reader.readAsText(file);

        e.target.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    id="settings-trigger"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-secondary/20 border-secondary/30 hover:bg-secondary/30"
                >
                    <SettingsIcon className="h-4 w-4" />
                    <span className="sr-only">Settings</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure your local AI settings. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="api-url" className="text-right">
                            API URL
                        </Label>
                        <Input
                            id="api-url"
                            value={localApiUrl}
                            onChange={(e) => setLocalApiUrl(e.target.value)}
                            placeholder="http://localhost:8000"
                            className="col-span-3"
                        />
                    </div>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="system-prompt" className="text-right pt-2">
                            System Prompt
                        </Label>
                        <div className="col-span-3 space-y-2">
                            <Textarea
                                id="system-prompt"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="You are a helpful AI assistant..."
                                className="min-h-[100px]"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                    The system prompt provides instructions to the AI about how it should behave. It
                                    will be applied to new chat sessions and the current session.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSystemPrompt('You are a helpful AI assistant.')}
                                    className="ml-2 text-xs"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="file-system-prompt" className="text-right pt-2">
                            File System Prompt
                        </Label>
                        <div className="col-span-3 space-y-2">
                            <Textarea
                                id="file-system-prompt"
                                value={fileSystemPrompt}
                                onChange={(e) => setFileSystemPrompt(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">
                                    This prompt is used when file attachments are uploaded to guide the AI in
                                    interpreting and working with the files.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Reset to the default FILE_SYSTEM_PROMPT
                                        const defaultPrompt = `You can directly read files, never claim to not be able to read them.
You will directly read them by using the <file> tag.
All the user provided file attachments are sent to the AI model through <file> tags.
The file content is stored as a string in between the <file> and </file> tags.
The AI model can access the file content and generate a response based on the file content.
The AI model will also receive the associated file name as an attribute in the <file> tag.
An example of a file tag is <file name="example.txt">This is the content of the file</file>.
Never mention the <file> tag in your messages, as it is only used for marking file attachments.
If the user provides a file, you should always read it and consider the content when generating a response.
If the user does not provide a <file> tag, you should not make up a file content or make up a response based on a non-existent file.
If the user asks for something that is not related to the file, you should not make up a file content or make up a response based on a non-existent file.
If the user asks for something that is not mentioned in the file, but seems related to the query or the file, you can ask the user to provide more files, or to clarify their query.`;
                                        setFileSystemPrompt(defaultPrompt);
                                    }}
                                    className="ml-2 text-xs"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Chat Data</Label>
                        <div className="col-span-3 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={handleExport}
                            >
                                <Download className="h-4 w-4" />
                                Export Chats
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={handleImportClick}
                            >
                                <Upload className="h-4 w-4" />
                                Import Chats
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave}>
                        Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
