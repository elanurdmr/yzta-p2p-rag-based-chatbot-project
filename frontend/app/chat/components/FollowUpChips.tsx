"use client";

import React from "react";
import { SparklesIcon } from "./SparklesIcon";

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const FollowUpChips: React.FC<FollowUpChipsProps> = ({ questions, onSelect, disabled }) => {
  if (!questions?.length) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs text-indigo-400 font-medium">Bunları da sorabilirsiniz</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => !disabled && onSelect(q)}
            disabled={disabled}
            className={`
              text-left text-xs px-3 py-2 rounded-xl border transition-all duration-150
              ${disabled
                ? "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50"
                : "border-indigo-100 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-sm cursor-pointer active:scale-[0.98]"
              }
            `}
          >
            <span className="mr-1.5 text-indigo-300">→</span>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FollowUpChips;
