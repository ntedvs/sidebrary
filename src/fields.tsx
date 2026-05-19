import { useEffect, useRef, useState } from "react"
import { Plus, X, UploadSimple } from "@phosphor-icons/react"
import { HexColorPicker, HexColorInput } from "react-colorful"
import type { Question, UploadedFile } from "./questions"

export function ShortText({
  q,
  value,
  onChange,
  onSubmit,
}: {
  q: Extract<Question, { kind: "short_text" }>
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <input
      autoFocus
      type="text"
      value={value}
      placeholder={q.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onSubmit()
        }
      }}
      className="w-full border-b border-rule bg-transparent pb-2 text-2xl font-light tracking-tight text-fg placeholder:text-muted focus:outline-none"
    />
  )
}

export function LongText({
  q,
  value,
  onChange,
  onSubmit,
}: {
  q: Extract<Question, { kind: "long_text" }>
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <textarea
      autoFocus
      value={value}
      placeholder={q.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          onSubmit()
        }
      }}
      rows={4}
      className="w-full resize-none border-b border-rule bg-transparent pb-2 text-xl font-light tracking-tight text-fg placeholder:text-muted focus:outline-none"
    />
  )
}

const DEFAULT_PALETTE = [
  "#ffffff",
  "#000000",
  "#e5e5e5",
  "#b8341d",
  "#1f3a5f",
  "#3d6b3a",
  "#e8b04b",
  "#7a4a8c",
]

function Swatch({
  color,
  onClick,
  disabled,
  children,
  size,
}: {
  color: string
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
  size: "sm" | "lg"
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-6 w-6"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative border border-rule transition-opacity hover:opacity-80 disabled:opacity-30 ${dim}`}
      style={{ backgroundColor: color }}
      aria-label={color}
    >
      {children}
    </button>
  )
}

function ColorPickerPopover({
  onAdd,
  onClose,
}: {
  onAdd: (c: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState("#888888")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const commit = () => {
    onAdd(draft.toLowerCase())
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-40 mt-3 flex flex-col gap-3 border border-rule bg-bg p-3"
    >
      <HexColorPicker color={draft} onChange={setDraft} />
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">#</span>
        <HexColorInput
          color={draft}
          onChange={setDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
          }}
          prefixed={false}
          className="font-mono w-24 border-b border-rule bg-transparent pb-1 text-sm uppercase text-fg focus:outline-none"
        />
        <button
          onClick={commit}
          className="font-mono ml-auto border border-rule px-3 py-1 text-xs uppercase tracking-widest text-fg transition-colors hover:bg-fg hover:text-bg"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export function ColorField({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { kind: "color" }>
  value: string[]
  onChange: (v: string[]) => void
}) {
  const max = q.max ?? 4
  const [picking, setPicking] = useState(false)
  const add = (c: string) => {
    if (value.includes(c) || value.length >= max) return
    onChange([...value, c])
  }
  const remove = (c: string) => onChange(value.filter((x) => x !== c))

  return (
    <div className="flex flex-col gap-8">
      <div className="relative flex flex-wrap gap-3">
        {value.map((c) => (
          <Swatch key={c} color={c} onClick={() => remove(c)} size="lg">
            <span className="font-mono absolute inset-x-0 -bottom-5 text-center text-xs uppercase tracking-widest text-muted">
              {c}
            </span>
            <span className="absolute inset-0 flex mix-blend-difference items-center justify-center text-fg opacity-0 transition-opacity group-hover:opacity-100">
              <X size={18} weight="regular" />
            </span>
          </Swatch>
        ))}
        {value.length < max && (
          <button
            onClick={() => setPicking((p) => !p)}
            className="flex h-16 w-16 items-center justify-center border border-rule text-muted transition-colors hover:border-fg hover:text-fg"
          >
            <Plus size={20} weight="regular" />
          </button>
        )}
        {picking && <ColorPickerPopover onAdd={add} onClose={() => setPicking(false)} />}
      </div>
      <div>
        <div className="font-mono mb-3 text-xs uppercase tracking-widest text-muted">Starter</div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_PALETTE.map((c) => (
            <Swatch
              key={c}
              color={c}
              size="sm"
              onClick={() => add(c)}
              disabled={value.includes(c) || value.length >= max}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

async function uploadOne(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/api/upload", { method: "POST", body: form })
  if (!res.ok) throw new Error(`upload failed: ${res.status}`)
  return (await res.json()) as UploadedFile
}

export function ImageUpload({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { kind: "image_upload" }>
  value: UploadedFile[]
  onChange: (v: UploadedFile[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handle = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    const list = Array.from(files)
    setPending((p) => p + list.length)
    try {
      const uploaded = await Promise.all(list.map(uploadOne))
      onChange(q.multiple ? [...value, ...uploaded] : uploaded.slice(0, 1))
    } catch (e: any) {
      setError(e?.message ?? "Upload failed")
    } finally {
      setPending((p) => p - list.length)
    }
  }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-6">
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handle(e.dataTransfer.files)
        }}
        className="cursor-pointer border border-rule px-6 py-10 text-center transition-colors hover:border-fg"
      >
        <div className="flex flex-col items-center gap-3 text-muted">
          <UploadSimple size={20} weight="regular" />
          <span className="font-mono text-xs uppercase tracking-widest">
            {pending > 0 ? `Uploading ${pending}...` : "Drop files or click to browse"}
          </span>
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple={q.multiple}
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>
      {error && <div className="font-mono text-xs uppercase tracking-widest text-fg">{error}</div>}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((f, i) => (
            <div key={f.key} className="group relative aspect-square">
              <img
                src={f.url}
                alt={f.name}
                className="h-full w-full border border-rule object-cover"
              />
              <button
                onClick={() => remove(i)}
                className="font-mono absolute right-1 top-1 bg-fg px-2 py-0.5 text-xs uppercase tracking-widest text-bg opacity-0 transition-opacity group-hover:opacity-100"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SingleSelect({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { kind: "single_select" }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col">
      {q.options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-baseline gap-6 border-t border-rule px-4 py-4 text-left transition-colors last:border-b hover:bg-white/5"
          >
            <span
              className={`text-lg font-light tracking-tight ${active ? "text-fg" : "text-muted"}`}
            >
              {opt.label}
            </span>
            {opt.blurb && (
              <span className="ml-auto hidden max-w-xs text-right text-sm text-muted sm:block">
                {opt.blurb}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function MultiSelect({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { kind: "multi_select" }>
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="flex flex-wrap gap-2">
      {q.options.map((opt) => {
        const active = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`border px-4 py-2 text-base font-light tracking-tight transition-colors ${
              active
                ? "border-fg bg-fg text-bg"
                : "border-rule text-muted hover:border-fg hover:text-fg"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
