'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlashCommand } from '@/types/copilot';

interface SlashCommandCardProps {
  command: SlashCommand;
  onExecute?: (command: string) => void;
  disabled?: boolean;
}

const categoryColors = {
  search: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  analysis: 'bg-green-100 text-green-800 hover:bg-green-200',
  classification: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  guidance: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
};

export const SlashCommandCard = ({
  command,
  onExecute,
  disabled = false,
}: SlashCommandCardProps) => {
  const handleClick = () => {
    if (!disabled && onExecute) {
      onExecute(command.command);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
      }`}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{command.icon}</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {command.command}
            </code>
          </CardTitle>
          <Badge
            variant="secondary"
            className={categoryColors[command.category]}
          >
            {command.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {command.description}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
        >
          Execute Command
        </Button>
      </CardContent>
    </Card>
  );
}

interface SlashCommandGridProps {
  commands: SlashCommand[];
  onExecuteCommand?: (command: string) => void;
  disabled?: boolean;
}

export const SlashCommandGrid = ({
  commands,
  onExecuteCommand,
  disabled = false,
}: SlashCommandGridProps) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {commands.map((command) => (
        <SlashCommandCard
          key={command.command}
          command={command}
          onExecute={onExecuteCommand}
          disabled={disabled}
        />
      ))}
    </div>
  )
