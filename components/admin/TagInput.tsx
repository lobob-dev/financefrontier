"use client";

import { useId, useState } from "react";

/** Type a tag and press Enter or comma. Backspace in an empty box removes the last one. */
export function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const id = useId();
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag || value.length >= 12) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    // reuse the spelling of a tag already in use
    const known = suggestions.find((s) => s.toLowerCase() === tag.toLowerCase());
    onChange([...value, known ?? tag]);
  };

  const unused = suggestions.filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <label htmlFor={id} className="label">Tags</label>
      <div className="field flex flex-wrap items-center gap-1.5 px-2 py-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-sm font-medium text-accent-strong">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent/20"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <input
          id={id}
          list={`${id}-list`}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              add(v.slice(0, -1));
              setText("");
            } else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
              setText("");
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            add(text);
            setText("");
          }}
          placeholder={value.length ? "" : "Valuation, Beginners…"}
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-[0.95rem] outline-none placeholder:text-muted"
        />
        <datalist id={`${id}-list`}>
          {unused.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="hint">Press Enter or type a comma after each tag. Up to 12.</p>
    </div>
  );
}
