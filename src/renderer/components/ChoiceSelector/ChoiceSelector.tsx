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
    <div className="flex flex-wrap gap-1.5 mt-2">
      {choices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => onSelect(choice)}
          disabled={disabled}
          className="group px-2.5 py-1 text-xs bg-copilot-surface hover:bg-copilot-surface-hover text-copilot-text border border-copilot-border hover:border-copilot-accent/50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={choice.description}
        >
          <span className="group-hover:text-copilot-accent transition-colors">{choice.label}</span>
        </button>
      ))}
    </div>
  )
}

export default ChoiceSelector
