import React from 'react'
import type { DetectedChoice } from '../../types'

interface ChoiceSelectorProps {
  choices: DetectedChoice[]
  onSelect: (choice: DetectedChoice) => void
  disabled?: boolean
}

export const ChoiceSelector: React.FC<ChoiceSelectorProps> = ({
  choices,
  onSelect,
  disabled = false,
}) => {
  if (!choices || choices.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {choices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => onSelect(choice)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs bg-copilot-accent/10 hover:bg-copilot-accent/20 text-copilot-accent border border-copilot-accent/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-start"
          title={choice.description}
        >
          <span className="font-medium">{choice.label}</span>
          {choice.description && (
            <span className="text-[10px] text-copilot-text-muted mt-0.5">
              {choice.description}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default ChoiceSelector
