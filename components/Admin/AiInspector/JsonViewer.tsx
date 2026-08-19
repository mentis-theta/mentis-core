import React from 'react';

interface JsonViewerProps {
  data: any;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  if (data === undefined || data === null) {
    return <span className="text-foreground-muted italic">Vazio</span>;
  }

  try {
    const formattedJson = JSON.stringify(data, null, 2);
    
    // Simples colorização (Opcional, pode usar bibliotecas como react-json-view depois)
    const colorize = (jsonString: string) => {
      return jsonString.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = "text-amber-600 dark:text-amber-400"; // number
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "text-indigo-600 dark:text-indigo-400 font-medium"; // key
            } else {
              cls = "text-emerald-600 dark:text-emerald-400"; // string
            }
          } else if (/true|false/.test(match)) {
            cls = "text-blue-600 dark:text-blue-400"; // boolean
          } else if (/null/.test(match)) {
            cls = "text-rose-600 dark:text-rose-400"; // null
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
    };

    return (
      <pre 
        className="text-xs bg-surface-container border border-border/60 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono"
        dangerouslySetInnerHTML={{ __html: colorize(formattedJson) }}
      />
    );
  } catch (e) {
    return (
      <pre className="text-xs bg-surface-container border border-border/60 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono text-rose-500">
        Falha ao renderizar JSON.
      </pre>
    );
  }
};
