import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { AIModel } from "../hooks/useChat";

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  isLoading = false,
  disabled = false,
}: ModelSelectorProps) {
  const selectedModelInfo = models && Array.isArray(models) ? models.find(model => model.id === selectedModel) : undefined;
  
  const displayName = selectedModelInfo?.name || (selectedModel 
    ? selectedModel.split('/').pop()?.replace(/-/g, ' ').replace(/@.*$/, '') || selectedModel
    : "Select model");
  
  const groupedModels: Record<string, AIModel[]> = {};
  
  if (Array.isArray(models)) {
    models.forEach(model => {
      const baseName = model.id.split('@')[0].split('/').pop() || '';
      if (!groupedModels[baseName]) {
        groupedModels[baseName] = [];
      }
      groupedModels[baseName].push(model);
    });
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <Button 
          variant="outline" 
          className="bg-secondary/20 text-sm border-secondary/30 hover:bg-secondary/30"
        >
          {isLoading 
            ? "Loading models..." 
            : displayName}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px] bg-grok-dark border-secondary/30 max-h-[400px] overflow-y-auto">
        {Array.isArray(models) && models.map((model) => (
          <DropdownMenuItem 
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={selectedModel === model.id ? "bg-secondary/20" : ""}
          >
            <div className="flex items-center w-full">
              <span className="flex-grow">{model.name}</span>
              {selectedModel === model.id && (
                <Check className="h-4 w-4 text-primary ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
