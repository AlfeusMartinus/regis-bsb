import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className = '' }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Initialize the content only once or when it changes externally
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCmd = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            editorRef.current.focus();
            handleInput();
        }
    };

    const ToolbarButton = ({ icon: Icon, cmd, title }: { icon: any, cmd: string, title: string }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                execCmd(cmd);
            }}
            title={title}
            className="p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded transition-colors"
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className={` border border-gray-300 rounded-md shadow-sm overflow-hidden flex flex-col bg-white ${className}`}>
            <style>
                {`
                    .rich-text-editor-content { outline: none; min-height: 150px; }
                    .rich-text-editor-content * { font-family: inherit !important; font-size: inherit !important; color: inherit !important; background-color: transparent !important; line-height: inherit !important; }
                    .rich-text-editor-content p, .rich-text-editor-content div { margin-bottom: 0.5rem; }
                    .rich-text-editor-content p:last-child, .rich-text-editor-content div:last-child { margin-bottom: 0; }
                    .rich-text-editor-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                    .rich-text-editor-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                    .rich-text-editor-content li { margin-bottom: 0.25rem !important; }
                    .rich-text-editor-content b, .rich-text-editor-content strong { font-weight: 700 !important; color: #111814 !important; }
                    .rich-text-editor-content i, .rich-text-editor-content em { font-style: italic !important; }
                    .rich-text-editor-content u { text-decoration: underline !important; }
                `}
            </style>
            <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
                <ToolbarButton icon={Bold} cmd="bold" title="Bold" />
                <ToolbarButton icon={Italic} cmd="italic" title="Italic" />
                <ToolbarButton icon={Underline} cmd="underline" title="Underline" />
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <ToolbarButton icon={List} cmd="insertUnorderedList" title="Bullet List" />
                <ToolbarButton icon={ListOrdered} cmd="insertOrderedList" title="Numbered List" />
            </div>
            <div
                ref={editorRef}
                className="p-3 overflow-y-auto rich-text-editor-content text-sm"
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                suppressContentEditableWarning
                data-placeholder={placeholder}
            />
        </div>
    );
};
