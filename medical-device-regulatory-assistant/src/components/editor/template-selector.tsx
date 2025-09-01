'use client';

import React, { useState } from 'react';
import { DocumentTemplate, TemplatePlaceholder } from '@/types/document';
import { documentTemplates, renderTemplate } from '@/lib/document-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Calendar, Type, List } from 'lucide-react';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (content: string, templateName: string) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    
    // Initialize form values with default values
    const initialValues: Record<string, string> = {};
    template.placeholders.forEach(placeholder => {
      initialValues[placeholder.key] = placeholder.defaultValue || '';
    });
    setFormValues(initialValues);
    
    setStep('configure');
  };

  const handleFormSubmit = () => {
    if (!selectedTemplate) return;

    const content = renderTemplate(selectedTemplate, formValues);
    onSelectTemplate(content, selectedTemplate.name);
    handleClose();
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setFormValues({});
    setStep('select');
    onClose();
  };

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const renderFormField = (placeholder: TemplatePlaceholder) => {
    const value = formValues[placeholder.key] || '';

    switch (placeholder.type) {
      case 'textarea':
        return (
          <Textarea
            id={placeholder.key}
            value={value}
            onChange={(e) => handleInputChange(placeholder.key, e.target.value)}
            placeholder={`Enter ${placeholder.label.toLowerCase()}`}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleInputChange(placeholder.key, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${placeholder.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {placeholder.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'date':
        return (
          <Input
            id={placeholder.key}
            type="date"
            value={value}
            onChange={(e) => handleInputChange(placeholder.key, e.target.value)}
          />
        );
      
      default:
        return (
          <Input
            id={placeholder.key}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(placeholder.key, e.target.value)}
            placeholder={`Enter ${placeholder.label.toLowerCase()}`}
          />
        );
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'predicate-analysis':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'device-classification':
        return <Type className="h-5 w-5 text-green-600" />;
      case 'submission-checklist':
        return <List className="h-5 w-5 text-purple-600" />;
      case 'guidance-summary':
        return <Calendar className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const isFormValid = () => {
    if (!selectedTemplate) return false;
    
    return selectedTemplate.placeholders
      .filter(p => p.required)
      .every(p => formValues[p.key]?.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose Document Template</DialogTitle>
              <DialogDescription>
                Select a template to create a new regulatory document with pre-filled structure and guidance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {documentTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {getTemplateIcon(template.type)}
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-500">
                      {template.placeholders.length} fields to configure
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Configure Template: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Fill in the required information to generate your document.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-96 overflow-y-auto">
              {selectedTemplate?.placeholders.map((placeholder) => (
                <div key={placeholder.key} className="space-y-2">
                  <Label htmlFor={placeholder.key} className="text-sm font-medium">
                    {placeholder.label}
                    {placeholder.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderFormField(placeholder)}
                </div>
              ))}
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button 
                onClick={handleFormSubmit}
                disabled={!isFormValid()}
              >
                Create Document
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}