import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface EditorProps {
    value?: string;
    onChange?: (content: string) => void;
    className?: string;
    placeholder?: string;
}

export default function Editor({ value, onChange, className = '', placeholder = 'Start typing...' }: EditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // Initialize Quill
        const quill = new Quill(editorRef.current, {
            theme: 'snow',
            placeholder,
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link', 'image'],
                        ['clean']
                    ],
                    handlers: {
                        image: function () {
                            const input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            input.click();

                            input.onchange = async () => {
                                const file = input.files?.[0];
                                if (!file) return;

                                // Convert to base64
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const range = quill.getSelection(true);
                                    quill.insertEmbed(range.index, 'image', e.target?.result);
                                };
                                reader.readAsDataURL(file);
                            };
                        }
                    }
                }
            }
        });

        quillRef.current = quill;

        // Set initial value
        if (value) {
            quill.root.innerHTML = value;
        }

        // Handle changes
        quill.on('text-change', () => {
            const html = quill.root.innerHTML;
            onChange?.(html);
        });

        // Handle pasted images
        quill.clipboard.addMatcher('IMG', (_node: any, delta: any) => {
            // This is tricky. Quill pastes images as base64 by default.
            // Intercepting paste event is better but complex.
            // For now, the toolbar button is the primary fix.
            return delta;
        });
    }, []);

    // Update content from props
    useEffect(() => {
        if (quillRef.current && value !== undefined) {
            const currentContent = quillRef.current.root.innerHTML;
            if (value !== currentContent) {
                quillRef.current.root.innerHTML = value;
            }
        }
    }, [value]);

    return (
        <div className={className}>
            <div ref={editorRef} className="h-64 bg-white" />
        </div>
    );
}
