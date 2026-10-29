import { CopyButton } from '../ui/CopyButton';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock = ({ code, language }: CodeBlockProps) => {
  return (
    <div className="border-2 border-wharf-border-primary overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-wharf-surface-secondary border-b-2 border-wharf-border-primary">
        <span className="font-mono text-[10px] font-bold text-wharf-text-tertiary uppercase">
          {language}
        </span>
        <CopyButton
          content={code}
          variant="codeblock"
          tooltipPosition="left"
        />
      </div>
      <pre className="p-3 bg-wharf-surface-primary overflow-x-auto">
        <code className="font-mono text-xs text-wharf-text-secondary whitespace-pre-wrap">
          {code}
        </code>
      </pre>
    </div>
  );
};
