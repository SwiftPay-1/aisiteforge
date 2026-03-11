import { useRef, useCallback, useMemo } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "html" | "css" | "js";
}

function highlightCode(code: string, language: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escaped = esc(code);

  if (language === "html") {
    return escaped
      // Comments
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>')
      // Tags
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tok-tag">$2</span>')
      // Attributes
      .replace(/([\w-]+)(=)/g, '<span class="tok-attr">$1</span>$2')
      // Strings
      .replace(/(&quot;[^&]*?&quot;|"[^"]*?")/g, '<span class="tok-string">$1</span>');
  }

  if (language === "css") {
    return escaped
      // Comments
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
      // @rules
      .replace(/(@[\w-]+)/g, '<span class="tok-keyword">$1</span>')
      // Properties
      .replace(/([\w-]+)(\s*:)/g, '<span class="tok-attr">$1</span>$2')
      // Strings
      .replace(/('[^']*?'|"[^"]*?")/g, '<span class="tok-string">$1</span>')
      // Numbers/units
      .replace(/\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?)\b/g, '<span class="tok-number">$1</span>')
      // Colors
      .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="tok-number">$1</span>');
  }

  // JS
  return escaped
    // Comments
    .replace(/(\/\/.*)/g, '<span class="tok-comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
    // Strings
    .replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`)/g, '<span class="tok-string">$1</span>')
    // Keywords
    .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|new|this|async|await|try|catch|throw|typeof|instanceof|in|of|switch|case|break|continue|do|null|undefined|true|false)\b/g, '<span class="tok-keyword">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-number">$1</span>')
    // Functions
    .replace(/\b(document|window|console|Math|Array|Object|String|Number|addEventListener|querySelector|querySelectorAll|getElementById|getElementsByClassName|forEach|map|filter|reduce|setTimeout|setInterval|requestAnimationFrame|fetch|then|catch|log|warn|error)\b/g, '<span class="tok-builtin">$1</span>');
}

export default function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const highlighted = useMemo(() => highlightCode(value, language), [value, language]);

  const lines = value.split("\n").length;

  return (
    <div className="code-editor-container">
      {/* Line numbers */}
      <div className="code-editor-lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i + 1} className="code-editor-line-num">{i + 1}</div>
        ))}
      </div>
      {/* Highlighted overlay */}
      <pre
        ref={preRef}
        className="code-editor-highlight"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
      />
      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="code-editor-textarea"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
      />
    </div>
  );
}
