"use client";

import { memo, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { common, createLowlight } from "lowlight";
import type { DocNode } from "@/lib/content/doc";
import { safeHref } from "@/lib/content/render";
import { uploadImage } from "@/lib/admin/upload";

const lowlight = createLowlight(common);

/** Images carry alt text for screen readers and an optional caption shown under them. */
const Figure = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },
});

type Props = {
  initial: DocNode;
  onChange: (doc: DocNode) => void;
  onStatus: (message: string | null) => void;
};

/** Built once, so the editor is never reconfigured while you type. */
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      isAllowedUri: (url) => safeHref(url) !== null,
    },
  }),
  CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
  Figure.configure({ allowBase64: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder: "Start writing. Drag images straight into the page." }),
];

const editorAttributes = {
  class: "prose-ff editor-surface",
  "aria-label": "Post content",
  role: "textbox",
  "aria-multiline": "true",
};

/** Memoised: the page around it re-renders on every keystroke, the editor does not need to. */
export const RichEditor = memo(function RichEditor({ initial, onChange, onStatus }: Props) {
  const onChangeRef = useRef(onChange);
  const onStatusRef = useRef(onStatus);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
    onStatusRef.current = onStatus;
  });

  // Created once. The handlers read the latest values through refs when they run.
  const [setup] = useState(() => {
    async function insertImages(files: File[], pos?: number) {
      const ed = editorRef.current;
      if (!ed) return;
      for (const [i, file] of files.entries()) {
        onStatusRef.current(`Uploading image${files.length > 1 ? ` ${i + 1} of ${files.length}` : ""}…`);
        try {
          const { url } = await uploadImage(file);
          const node = { type: "image", attrs: { src: url, alt: "", caption: "" } };
          if (typeof pos === "number") ed.chain().focus().insertContentAt(pos, node).run();
          else ed.chain().focus().insertContent(node).run();
          onStatusRef.current("Image added. Click it to add alt text and a caption.");
        } catch (e) {
          onStatusRef.current(e instanceof Error ? e.message : "The image could not be uploaded.");
        }
      }
    }
    const editorProps = {
      attributes: editorAttributes,
      handleDrop(view: Editor["view"], event: DragEvent, _slice: unknown, moved: boolean) {
        const files = imagesFrom(event.dataTransfer);
        if (moved || !files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(files, pos);
        return true;
      },
      handlePaste(_view: Editor["view"], event: ClipboardEvent) {
        const files = imagesFrom(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    };
    return { insertImages, editorProps };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initial,
    editorProps: setup.editorProps,
    // A plain copy: the editor's own objects cannot be sent to the server as they are.
    onUpdate: ({ editor }) => onChangeRef.current(JSON.parse(JSON.stringify(editor.getJSON())) as DocNode),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-soft">
      {editor && <Toolbar editor={editor} onPickImages={setup.insertImages} />}
      {editor && <ImageDetails editor={editor} />}
      <div className="px-5 py-6 sm:px-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

function imagesFrom(data: DataTransfer | null) {
  return Array.from(data?.files ?? []).filter((f) => f.type.startsWith("image/"));
}

function Toolbar({ editor, onPickImages }: { editor: Editor; onPickImages: (files: File[]) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const value = window.prompt("Link address (leave empty to remove the link)", previous ?? "https://");
    if (value === null) return;
    if (value.trim() === "" || value.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = safeHref(value.trim());
    if (!href) {
      window.alert("That does not look like a web or email address.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const sep = <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-2xl border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur"
    >
      <ToolButton label="Heading" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><span className="px-1 text-[13px]">Heading</span></ToolButton>
      <ToolButton label="Subheading" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><span className="px-1 text-[13px]">Subheading</span></ToolButton>
      {sep}
      <ToolButton label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolButton>
      <ToolButton label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><i className="font-serif">I</i></ToolButton>
      <ToolButton label="Link" active={s.link} onClick={setLink}><Icon d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></ToolButton>
      {sep}
      <ToolButton label="Bulleted list" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}><Icon d="M10 6h10M10 12h10M10 18h10M4 5h1.5v4M4 9h3M4 15.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3" /></ToolButton>
      <ToolButton label="Quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Icon d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6" /></ToolButton>
      <ToolButton label="Code block" active={s.code} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Icon d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></ToolButton>
      <ToolButton label="Insert table" active={s.table} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Icon d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14" /></ToolButton>
      {sep}
      <ToolButton label="Insert image" onClick={() => fileRef.current?.click()}><Icon d="M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5M15.5 8.5h.01" /></ToolButton>
      {sep}
      <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!s.canUndo}><Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></ToolButton>
      <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!s.canRedo}><Icon d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></ToolButton>
      {s.table && (
        <span className="ml-1 flex flex-wrap items-center gap-1 text-xs font-medium">
          {(
            [
              ["Add row", () => editor.chain().focus().addRowAfter().run()],
              ["Add column", () => editor.chain().focus().addColumnAfter().run()],
              ["Delete row", () => editor.chain().focus().deleteRow().run()],
              ["Delete column", () => editor.chain().focus().deleteColumn().run()],
              ["Delete table", () => editor.chain().focus().deleteTable().run()],
            ] as const
          ).map(([label, run]) => (
            <button
              key={label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className="rounded-md px-2 py-1 text-ink-soft ring-1 ring-line hover:text-accent-strong"
            >
              {label}
            </button>
          ))}
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void onPickImages(files);
        }}
      />
    </div>
  );
}

/** Appears when an image in the post is selected, to set its alt text and caption. */
function ImageDetails({ editor }: { editor: Editor }) {
  const image = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e.isActive("image")
        ? { alt: String(e.getAttributes("image").alt ?? ""), caption: String(e.getAttributes("image").caption ?? "") }
        : null,
  });
  const [draft, setDraft] = useState<{ alt: string; caption: string } | null>(null);
  const current = draft ?? image;
  if (!image || !current) return null;

  const update = (patch: Partial<{ alt: string; caption: string }>) => {
    const next = { ...current, ...patch };
    setDraft(next);
    editor.commands.updateAttributes("image", next);
  };

  return (
    <div className="grid gap-3 border-b border-line bg-accent-soft/50 px-4 py-3 sm:grid-cols-2" onBlur={() => setDraft(null)}>
      <div>
        <label htmlFor="img-alt" className="label">Alt text</label>
        <input
          id="img-alt"
          className="field"
          value={current.alt}
          placeholder="Describe the image for people who cannot see it"
          onChange={(e) => update({ alt: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="img-caption" className="label">Caption (optional)</label>
        <input
          id="img-caption"
          className="field"
          value={current.caption}
          placeholder="Shown under the image"
          onChange={(e) => update({ caption: e.target.value })}
        />
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  /** Only toggle buttons (bold, lists and so on) report whether they are on. */
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition disabled:opacity-35 ${
        active ? "bg-accent-soft text-accent-strong" : "text-ink-soft hover:bg-bg-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
