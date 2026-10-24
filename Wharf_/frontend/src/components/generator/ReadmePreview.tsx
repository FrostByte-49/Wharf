import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Edit2,
  Eye,
  Split,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Check,
  Type,
  Hash,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyButton } from '../ui/CopyButton';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import 'github-markdown-css/github-markdown.css';
import 'katex/dist/katex.min.css';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('python', python);
// Mermaid Support
import mermaid from 'mermaid';

// Import Types From react-markdown
import type { Components } from 'react-markdown';

interface ReadmePreviewProps {
  content: string;
  isGenerating?: boolean;
  onContentChange?: (content: string) => void;
}

type ViewMode = 'edit' | 'preview' | 'split';

export const ReadmePreview = ({
  content: initialContent,
  isGenerating = false,
  onContentChange,
}: ReadmePreviewProps) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mermaidRendered, setMermaidRendered] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const previewRef = useRef<HTMLDivElement>(null);
  const previousInitialContent = useRef(initialContent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Sync Content When Generation Updates
  useEffect(() => {
    if (previousInitialContent.current !== initialContent) {
      setContent(initialContent);
      previousInitialContent.current = initialContent;
    }
  }, [initialContent]);

  // Initialize Mermaid With Light Theme
  useEffect(() => {
    mermaid.initialize({
      theme: 'base',
      themeVariables: {
        background: '#ffffff',
        primaryColor: '#24292f',
        primaryBorderColor: '#d0d7de',
        primaryTextColor: '#24292f',
        lineColor: '#57606a',
        secondaryColor: '#f6f8fa',
        tertiaryColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: '14px',
        edgeLabelBackground: '#ffffff',
        nodeBorder: '#d0d7de',
        nodeTextColor: '#24292f',
        mainBkg: '#ffffff',
        nodeBackground: '#f6f8fa',
        nodeBorderColor: '#d0d7de',
        clusterBkg: '#f6f8fa',
        clusterBorder: '#d0d7de',
        defaultLinkColor: '#57606a',
        titleColor: '#24292f',
        edgeLabelColor: '#24292f',
        actorBorder: '#d0d7de',
        actorBkg: '#f6f8fa',
        actorTextColor: '#24292f',
        actorLineColor: '#57606a',
        signalColor: '#57606a',
        signalTextColor: '#24292f',
        labelBoxBkgColor: '#f6f8fa',
        labelBoxBorderColor: '#d0d7de',
        labelTextColor: '#24292f',
        loopTextColor: '#24292f',
        noteBorderColor: '#d0d7de',
        noteBkgColor: '#f6f8fa',
        noteTextColor: '#24292f',
        activationBorderColor: '#d0d7de',
        activationBkgColor: '#f6f8fa',
        sequenceNumberColor: '#24292f',
        sectionBkgColor: '#f6f8fa',
        altSectionBkgColor: '#f6f8fa',
        sectionBorderColor: '#d0d7de',
        sectionTextColor: '#24292f',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      securityLevel: 'loose',
    });
  }, []);

  // Render Mermaid Diagrams In Preview
  useEffect(() => {
    if (viewMode === 'edit') return;

    const renderMermaid = async () => {
      if (!previewRef.current) return;

      const mermaidElements = previewRef.current.querySelectorAll('.mermaid');

      if (mermaidElements.length === 0) {
        setMermaidRendered(false);
        return;
      }

      try {
        let index = 0;

        for (const element of mermaidElements) {
          let code = element.textContent || '';

          if (!code.trim()) continue;

          // Auto-Fix Unquoted Node Labels With Parentheses e.g. A[Label (Extra)] -> A["Label (Extra)"]
          code = code.replace(/\[([^"\][]*?\([^)]*?\)[^"\][]*?)\]/g, '["$1"]');

          try {
            element.removeAttribute('data-processed');

            const id = `mermaid-${Date.now()}-${index++}`;

            const { svg } = await mermaid.render(id, code);

            element.innerHTML = svg;
            element.classList.add('mermaid-rendered');
          } catch (error) {
            console.error('Mermaid render error:', error);

            element.innerHTML = `
              <div style="
                padding:16px;
                border:1px solid #d0d7de;
                background:#fff8f8;
                color:#cf222e;
                font-family:monospace;
                font-size:12px;
              ">
                Failed to render Mermaid diagram
              </div>
            `;
          }
        }

        setMermaidRendered(true);
      } catch (error) {
        console.error(error);
      }
    };

    // Delay To Ensure DOM Is Ready
    const timeoutId = setTimeout(renderMermaid, 100);
    return () => clearTimeout(timeoutId);
  }, [content, viewMode, isFullscreen]);

  // Handle Resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const deltaY = e.clientY - startY.current;
      const newHeight = Math.max(
        200,
        Math.min(window.innerHeight * 0.85, startHeight.current + deltaY)
      );
      setContentHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'none';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // const handleResizeStart = (e: React.MouseEvent) => {
  //   if (isFullscreen && contentHeight === 'auto') {
  //     const rect = contentAreaRef.current?.getBoundingClientRect()
  //     if (rect) {
  //       setContentHeight(rect.height)
  //       startHeight.current = rect.height
  //     }
  //   } else if (typeof contentHeight === 'number') {
  //     startHeight.current = contentHeight
  //   } else {
  //     const rect = contentAreaRef.current?.getBoundingClientRect()
  //     if (rect) {
  //       startHeight.current = rect.height
  //     }
  //   }

  //   isResizing.current = true
  //   startY.current = e.clientY
  //   document.body.style.cursor = 'row-resize'
  //   document.body.style.userSelect = 'none'
  // }

  // Handle Fullscreen Toggle
  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    // Reset To Auto Height When Entering Fullscreen
    if (!isFullscreen) {
      setContentHeight('auto');
    } else {
      // When Exiting Fullscreen, Set A Default Height
      setContentHeight('auto');
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewModeOptions = [
    { id: 'edit', label: 'Edit', icon: Edit2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'split', label: 'Split', icon: Split },
  ] as const;

  // Define Markdown Components With Proper Types
  const markdownComponents: Components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    code({ className, children, node, ref, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match?.[1];

      // Mermaid
      if (language === 'mermaid') {
        return (
          <div
            className="mermaid my-4 overflow-x-auto"
            style={{
              background: '#ffffff',
              padding: '16px',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
            }}
          >
            {String(children).replace(/\n$/, '')}
          </div>
        );
      }

      // Inline Code
      if (!className) {
        const textToCopy = String(children);
        return (
          <code
            onClick={(e) => {
              e.preventDefault();
              navigator.clipboard.writeText(textToCopy);
              const target = e.currentTarget;
              const originalBg = target.style.backgroundColor;
              target.style.backgroundColor = 'rgba(63, 185, 80, 0.3)';
              target.title = 'Copied!';
              setTimeout(() => {
                target.style.backgroundColor = originalBg;
                target.title = 'Click to copy';
              }, 500);
            }}
            title="Click to copy"
            className="cursor-pointer hover:bg-wharf-surface-secondary transition-colors"
            style={{
              backgroundColor: 'rgba(175,184,193,0.2)',
              color: '#24292f',
              padding: '0.2em 0.4em',
              borderRadius: '6px',
              fontSize: '85%',
              fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,monospace',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      // Code Blocks
      const codeString = String(children).replace(/\n$/, '');
      return (
        <div className="relative group my-4">
          <CopyButton
            content={codeString}
            variant="codeblock"
            tooltipPosition="left"
            className="absolute top-2 right-2 z-10"
          />
          <SyntaxHighlighter
            language={language || 'text'}
            PreTag="div"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={oneLight as any}
            customStyle={{
              margin: '0',
              borderRadius: '6px',
              border: '1px solid #d0d7de',
              background: '#f6f8fa',
              padding: '16px',
              fontSize: '14px',
            }}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },

    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#0969da',
            textDecoration: 'none',
          }}
          {...props}
        >
          {children}
        </a>
      );
    },

    img({ src, alt, ...props }) {
      return (
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
          {...props}
        />
      );
    },

    pre({ children }) {
      return <>{children}</>;
    },

    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-4 border border-[#d0d7de] rounded-md">
          <table className="w-full border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },

    thead({ children, ...props }) {
      return (
        <thead className="bg-[#f6f8fa]" {...props}>
          {children}
        </thead>
      );
    },

    th({ children, ...props }) {
      return (
        <th
          className="border border-[#d0d7de] px-4 py-2 text-left font-semibold text-[#24292f]"
          {...props}
        >
          {children}
        </th>
      );
    },

    td({ children, ...props }) {
      return (
        <td className="border border-[#d0d7de] px-4 py-2 text-[#24292f] bg-white" {...props}>
          {children}
        </td>
      );
    },

    ul({ children, ...props }) {
      return (
        <ul className="list-disc pl-6 my-3 space-y-1" {...props}>
          {children}
        </ul>
      );
    },

    ol({ children, ...props }) {
      return (
        <ol className="list-decimal pl-6 my-3 space-y-1" {...props}>
          {children}
        </ol>
      );
    },

    li({ children, ...props }) {
      return (
        <li className="mb-0.5 text-[#24292f]" {...props}>
          {children}
        </li>
      );
    },
  };

  // Determine The Height Style
  const getHeightStyle = () => {
    if (isFullscreen) {
      return { height: '85%', maxHeight: '100%' };
    } else if (contentHeight === 'auto') {
      return { height: '80vh', maxHeight: '80vh' };
    } else {
      return { height: `${contentHeight}px`, maxHeight: `${contentHeight}px` };
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-[999]' : ''}`} ref={containerRef}>
      <div
        className={`
        overflow-x-hidden flex flex-col rounded-xl transition-all
        border-2 shadow-none bg-transparent 
        md:border-2 md:border-wharf-border-primary md:shadow-[4px_4px_0_0_#0a0a0a] md:bg-wharf-surface-primary
        ${isFullscreen ? 'h-screen !rounded-none !border-0 md:!border-0' : ''}
      `}
      >
        {/* Toolbar */}
        <div className="border-b-2 md:border-b-2 border-wharf-border-primary p-3 bg-wharf-surface-secondary flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-wharf-error" />
              <div className="w-3 h-3 rounded-full bg-wharf-warning" />
              <div className="w-3 h-3 rounded-full bg-wharf-success" />
            </div>

            <span className="font-mono text-xs font-bold tracking-tight ml-2 text-wharf-text-secondary whitespace-nowrap">
              README.md
            </span>

            {isGenerating && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-wharf-text-tertiary bg-wharf-surface-primary px-2 py-0.5 border border-wharf-border-secondary whitespace-nowrap">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex border border-wharf-border-primary overflow-hidden">
              {viewModeOptions.map((mode) => {
                const isActive = viewMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`
                      px-2.5 py-1 flex items-center gap-1.5 transition-all duration-200 cursor-pointer border border-wharf-border-primary 
                      ${
                        isActive
                          ? 'bg-wharf-text-primary text-wharf-surface-primary'
                          : 'bg-wharf-surface-secondary hover:bg-wharf-surface-primary text-wharf-text-secondary'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] font-bold hidden sm:inline">
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6 mx-2 bg-wharf-border-primary" />

            {/* Action Buttons */}
            <CopyButton
              content={content}
              variant="toolbar"
              label="Copy"
              tooltipPosition="top"
            />

            <button
              onClick={handleDownload}
              className="p-1.5 border-2 border-wharf-border-primary bg-wharf-surface-primary hover:bg-wharf-surface-secondary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="font-mono text-[10px] font-bold hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handleFullscreenToggle}
              className="p-1.5 border-2 border-wharf-border-primary bg-wharf-surface-primary hover:bg-wharf-surface-secondary transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          ref={contentAreaRef}
          className="flex overflow-hidden relative border-x-0 md:border-x-0 border-wharf-border-primary bg-wharf-surface-primary"
          style={getHeightStyle()}
        >
          {/* Editor */}
          {viewMode === 'edit' && (
            <div
              className={`
              flex flex-col relative w-full h-full
            `}
            >
              <textarea
                className="w-full flex-1 p-4 bg-wharf-surface-primary outline-none resize-none font-mono text-sm text-wharf-text-primary scrollbar-hidden"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="# Your README content will appear here..."
                spellCheck={false}
                style={{ height: '100%' }}
              />
            </div>
          )}

          {viewMode === 'split' && (
            <>
              <div
                className="flex flex-col relative w-1/2 h-full border-r-2 border-wharf-border-primary z-10"
              >
                <textarea
                  className="w-full flex-1 p-4 bg-wharf-surface-primary outline-none resize-none font-mono text-sm text-wharf-text-primary scrollbar-hidden"
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="# Your README content will appear here..."
                  spellCheck={false}
                  style={{ height: '100%' }}
                />
              </div>
              <div className="w-1/2 h-full bg-white relative">
                <div
                  ref={previewRef}
                  className="markdown-body github-readme-preview overflow-y-auto h-full scrollbar-hidden"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#24292f',
                    padding: '24px',
                    maxWidth: '100%',
                  }}
                >
                  {content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                      components={markdownComponents}
                    >
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-wharf-text-tertiary opacity-60">
                      <FileText className="w-16 h-16 mb-4" />
                      <p className="font-mono text-base font-bold">No content to preview</p>
                      <p className="font-mono text-sm mt-1">
                        Generate documentation or start typing in the editor
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Preview (Full) */}
          {viewMode === 'preview' && (
            <div className="w-full h-full bg-white relative">
              <div
                ref={previewRef}
                className="markdown-body github-readme-preview overflow-y-auto h-full scrollbar-hidden"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#24292f',
                  padding: '24px',
                  maxWidth: '100%',
                }}
              >
                {content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={markdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-wharf-text-tertiary opacity-60">
                    <FileText className="w-16 h-16 mb-4" />
                    <p className="font-mono text-base font-bold">No content to preview</p>
                    <p className="font-mono text-sm mt-1">
                      Generate documentation or start typing in the editor
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle - Only Show When Not In Fullscreen Mode */}
        {/* {!isFullscreen && (
          <div 
            className="h-2 bg-wharf-surface-secondary hover:bg-wharf-border-primary cursor-row-resize flex items-center justify-center border-t-4 border-wharf-border-primary shrink-0 transition-colors duration-200 group"
            onMouseDown={handleResizeStart}
          >
            <div className="w-4 h-4 text-wharf-text-tertiary opacity-30 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
              </svg>
            </div>
          </div>
        )} */}

        {/* Status Bar */}
        <div className="border-t-2 md:border-t-2 border-wharf-border-primary p-2 bg-wharf-surface-secondary flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <span className="font-mono text-[10px] text-wharf-text-secondary whitespace-nowrap flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Lines: {content.split('\n').length}
            </span>
            <span className="font-mono text-[12px] text-wharf-text-secondary ">|</span>
            <span className="font-mono text-[10px] text-wharf-text-secondary whitespace-nowrap flex items-center gap-1.5">
              <Type className="w-3 h-3" />
              Characters: {content.length}
            </span>
            <span className="font-mono text-[12px] text-wharf-text-secondary ">|</span>
            <span className="font-mono text-[10px] text-wharf-text-secondary whitespace-nowrap flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              Words: {content.split(/\s+/).filter(Boolean).length}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-[10px] text-wharf-text-secondary whitespace-nowrap flex items-center gap-1.5">
              {viewMode === 'edit' ? (
                <>
                  <Edit2 className="w-3 h-3" />
                  Editing
                </>
              ) : viewMode === 'preview' ? (
                <>
                  <Eye className="w-3 h-3" />
                  Preview
                </>
              ) : (
                <>
                  <Split className="w-3 h-3" />
                  Split View
                </>
              )}
            </span>
            {mermaidRendered && (
              <span className="font-mono text-[10px] text-wharf-green-darker flex items-center gap-1 whitespace-nowrap">
                <span className="font-mono text-[12px] text-wharf-text-secondary ">|</span>
                <Check className="w-3 h-3" />
                Mermaid
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
