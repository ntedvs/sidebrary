import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react"
import { questions, type Answers, type AnswerValue } from "./questions"
import { ColorField, ImageUpload, LongText, MultiSelect, ShortText, SingleSelect } from "./fields"

const STORAGE_KEY = "sidebrary.intake.v1"
const SUBMIT_URL = "/api/intake"

type Saved = { answers: Answers; index: number }

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { answers: {}, index: 0 }
}

function defaultValue(kind: string): AnswerValue {
  if (kind === "multi_select" || kind === "color") return []
  if (kind === "image_upload") return []
  return ""
}

function isEmpty(v: AnswerValue) {
  if (typeof v === "string") return v.trim() === ""
  return v.length === 0
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting"; phase: string }
  | { kind: "success"; siteUrl: string }
  | { kind: "error" }

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Designing your site",
  paused: "Paused",
  complete: "Done",
  errored: "Error",
  terminated: "Stopped",
}

export default function App() {
  const [{ answers, index }, setState] = useState<Saved>(() => loadSaved())
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, index }))
  }, [answers, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const q = questions[index]
  const total = questions.length

  const value = useMemo(() => answers[q?.id] ?? defaultValue(q?.kind ?? ""), [answers, q])

  const setValue = (v: AnswerValue) =>
    setState((s) => ({ ...s, answers: { ...s.answers, [q.id]: v } }))

  const canAdvance = !q?.required || !isEmpty(answers[q.id] ?? defaultValue(q.kind))

  const next = () => {
    if (!canAdvance) return
    if (index < total - 1) {
      setState((s) => ({ ...s, index: s.index + 1 }))
    } else {
      submit()
    }
  }

  const prev = () => {
    if (index > 0) setState((s) => ({ ...s, index: s.index - 1 }))
  }

  const submit = async () => {
    setSubmitState({ kind: "submitting", phase: "queued" })
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, submittedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { id } = (await res.json()) as { id: string }

      while (true) {
        await new Promise((r) => setTimeout(r, 2000))
        const s = await fetch(`/api/intake/${id}/status`)
        if (!s.ok) throw new Error(`status HTTP ${s.status}`)
        const data = (await s.json()) as {
          status: string
          siteUrl: string | null
          error: string | null
        }
        setSubmitState({ kind: "submitting", phase: data.status })
        if (data.status === "complete" && data.siteUrl) {
          localStorage.removeItem(STORAGE_KEY)
          setSubmitState({ kind: "success", siteUrl: data.siteUrl })
          return
        }
        if (data.status === "errored" || data.status === "terminated") {
          console.error("[generate]", data.error)
          setSubmitState({ kind: "error" })
          return
        }
      }
    } catch (e) {
      console.error("[submit]", e)
      setSubmitState({ kind: "error" })
    }
  }

  if (submitState.kind === "submitting") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 sm:px-10">
        <div className="flex flex-col gap-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {PHASE_LABEL[submitState.phase] ?? "Building your preview"}
          </div>
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">One moment.</h1>
        </div>
      </main>
    )
  }

  if (submitState.kind === "success") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 sm:px-10">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">Thank you.</h1>
          <a
            href={submitState.siteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-fg underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            View your preview
            <ArrowRight size={14} weight="regular" />
          </a>
        </div>
      </main>
    )
  }

  if (submitState.kind === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 sm:px-10">
        <div className="flex flex-col gap-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            Something went wrong
          </div>
          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
            We couldn't build your preview.
          </h1>
          <p className="max-w-md text-sm text-muted">
            Your answers are saved. Give it another try.
          </p>
          <button
            onClick={submit}
            className="flex items-center gap-2 self-start font-mono text-xs uppercase tracking-widest text-fg transition-opacity hover:opacity-70"
          >
            Try again
            <ArrowRight size={14} weight="regular" />
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 sm:px-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-8"
        >
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>

          <h1 className="text-4xl font-light tracking-tight sm:text-5xl">{q.prompt}</h1>

          <Field q={q} value={value} setValue={setValue} onSubmit={next} />

          <div className="flex items-center gap-6 pt-2">
            <button
              onClick={prev}
              disabled={index === 0}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-fg transition-opacity hover:opacity-70 disabled:opacity-15"
            >
              <ArrowLeft size={14} weight="regular" />
              Back
            </button>
            <button
              onClick={next}
              disabled={!canAdvance}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-fg transition-opacity hover:opacity-70 disabled:opacity-15"
            >
              {index === total - 1 ? "Submit" : "Next"}
              <ArrowRight size={14} weight="regular" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

function Field({
  q,
  value,
  setValue,
  onSubmit,
}: {
  q: (typeof questions)[number]
  value: AnswerValue
  setValue: (v: AnswerValue) => void
  onSubmit: () => void
}) {
  switch (q.kind) {
    case "short_text":
      return <ShortText q={q} value={value as string} onChange={setValue} onSubmit={onSubmit} />
    case "long_text":
      return <LongText q={q} value={value as string} onChange={setValue} onSubmit={onSubmit} />
    case "color":
      return <ColorField q={q} value={value as string[]} onChange={setValue} />
    case "image_upload":
      return <ImageUpload q={q} value={value as any} onChange={setValue} />
    case "single_select":
      return <SingleSelect q={q} value={value as string} onChange={setValue} />
    case "multi_select":
      return <MultiSelect q={q} value={value as string[]} onChange={setValue} />
  }
}
