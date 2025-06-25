import React, { useState } from 'react';
import { VisualWorkflowBuilder } from './VisualWorkflowBuilder';

export const AutomationPanel: React.FC = () => {
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(true);

  return (
    <div className="h-full">
      {showWorkflowBuilder ? (
        <VisualWorkflowBuilder />
      ) : (
        // Fallback to the original AutomationPanel content
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Constructor de Automatizaciones</h3>
          <p className="mt-2 text-sm text-gray-500">
            Hemos actualizado a nuestro nuevo constructor visual de flujos de trabajo.
          </p>
          <button
            onClick={() => setShowWorkflowBuilder(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Abrir Constructor Visual
          </button>
        </div>
      )}
    </div>
  );
};