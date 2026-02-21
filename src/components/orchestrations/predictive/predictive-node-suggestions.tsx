// src/components/orchestrations/predictive/predictive-node-suggestions.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowNodeSuggestion } from '@/lib/ai/predictive-workflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Info } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface PredictiveNodeSuggestionsProps {
  suggestions: WorkflowNodeSuggestion[];
  onSelect: (suggestion: WorkflowNodeSuggestion) => void;
  isLoading?: boolean;
}

export function PredictiveNodeSuggestions({ 
  suggestions, 
  onSelect, 
  isLoading = false 
}: PredictiveNodeSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
        Analisando padrões para sugerir o próximo passo...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Nenhuma sugestão disponível no momento
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center text-sm font-medium text-primary">
        <Sparkles className="mr-2 h-4 w-4" />
        Sugestões inteligentes
      </div>
      
      <AnimatePresence>
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.nodeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                expandedSuggestion === suggestion.nodeId ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onSelect(suggestion)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {suggestion.label}
                    </CardTitle>
                    <div className="mt-1 flex items-center">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% de confiança
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="ml-2 h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Baseado em {suggestion.metadata.successRate}% de sucesso em casos similares</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSuggestion(
                        expandedSuggestion === suggestion.nodeId ? null : suggestion.nodeId
                      );
                    }}
                  >
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Selecionar sugestão</span>
                  </Button>
                </div>
              </CardHeader>
              
              <AnimatePresence>
                {expandedSuggestion === suggestion.nodeId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        {suggestion.metadata.description}
                      </p>
                      <div className="mt-2 text-xs">
                        <p className="font-medium">Exemplo:</p>
                        <p className="text-muted-foreground">{suggestion.metadata.example}</p>
                      </div>
                      <Button 
                        className="mt-3 w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(suggestion);
                        }}
                      >
                        Usar esta sugestão
                      </Button>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
