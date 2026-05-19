export { SiteGenerationWorkflow } from "./workflow"

const ALLOWED_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173"])

const MAX_INTAKE_BYTES = 256 * 1024
const MAX_STRING_LEN = 5000
const MAX_ARRAY_LEN = 32
const MAX_ANSWERS = 64

function validateAnswers(answers: unknown): string | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return "answers must be an object"
  }
  const entries = Object.entries(answers as Record<string, unknown>)
  if (entries.length > MAX_ANSWERS) return "too many answers"
  for (const [key, value] of entries) {
    if (key.length > 64) return `answer key too long: ${key.slice(0, 32)}`
    if (typeof value === "string") {
      if (value.length > MAX_STRING_LEN) return `answer "${key}" too long`
    } else if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LEN) return `answer "${key}" has too many items`
      for (const item of value) {
        if (typeof item === "string") {
          if (item.length > MAX_STRING_LEN) return `answer "${key}" item too long`
        } else if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>
          for (const v of Object.values(obj)) {
            if (typeof v === "string" && v.length > MAX_STRING_LEN) {
              return `answer "${key}" item field too long`
            }
          }
        } else {
          return `answer "${key}" has invalid item type`
        }
      }
    } else if (value != null) {
      return `answer "${key}" has invalid type`
    }
  }
  return null
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get("origin")

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors(origin) })
    }

    if (url.pathname === "/api/intake" && req.method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") ?? "unknown"
      const { success } = await env.INTAKE_LIMITER.limit({ key: ip })
      if (!success) {
        return json(
          { error: "Too many submissions. Slow down and try again in a minute." },
          429,
          origin,
        )
      }
      const raw = await req.text()
      if (raw.length > MAX_INTAKE_BYTES) {
        return json({ error: "payload too large" }, 413, origin)
      }
      let body: { answers?: unknown } | null = null
      try {
        body = JSON.parse(raw)
      } catch {
        return json({ error: "invalid json" }, 400, origin)
      }
      if (!body || typeof body !== "object" || !body.answers) {
        return json({ error: "invalid body" }, 400, origin)
      }
      const invalid = validateAnswers(body.answers)
      if (invalid) return json({ error: invalid }, 400, origin)
      const answers = body.answers as Record<string, unknown>
      const id = crypto.randomUUID()
      const record = { id, answers, receivedAt: new Date().toISOString() }
      await env.INTAKE_KV.put(`intake:${id}`, JSON.stringify(record))

      const reqOrigin = `${url.protocol}//${url.host}`
      await env.SITE_WORKFLOW.create({ id, params: { id, answers, origin: reqOrigin } })

      return json({ ok: true, id, statusUrl: `/api/intake/${id}/status` }, 200, origin)
    }

    const statusMatch = url.pathname.match(/^\/api\/intake\/([^/]+)\/status$/)
    if (statusMatch && req.method === "GET") {
      const id = statusMatch[1]
      const instance = await env.SITE_WORKFLOW.get(id).catch(() => null)
      if (!instance) return json({ error: "not found" }, 404, origin)
      const status = await instance.status()
      const done = status.status === "complete"
      return json(
        {
          id,
          status: status.status,
          siteUrl: done ? `/sites/${id}` : null,
          error: status.status === "errored" ? String(status.error ?? "unknown") : null,
        },
        200,
        origin,
      )
    }

    const intakeMatch = url.pathname.match(/^\/api\/intake\/([^/]+)$/)
    if (intakeMatch && req.method === "GET") {
      const raw = await env.INTAKE_KV.get(`intake:${intakeMatch[1]}`)
      if (!raw) return json({ error: "not found" }, 404, origin)
      return new Response(raw, {
        headers: { "content-type": "application/json", ...cors(origin) },
      })
    }

    if (url.pathname === "/api/intake" && req.method === "GET") {
      const list = await env.INTAKE_KV.list({ prefix: "intake:" })
      return json({ keys: list.keys.map((k) => k.name) }, 200, origin)
    }

    if (url.pathname === "/api/upload" && req.method === "POST") {
      const ip = req.headers.get("cf-connecting-ip") ?? "unknown"
      const { success } = await env.UPLOAD_LIMITER.limit({ key: ip })
      if (!success) {
        return json(
          { error: "Too many uploads. Slow down and try again in a minute." },
          429,
          origin,
        )
      }
      const form = await req.formData().catch(() => null)
      const file = form?.get("file")
      if (!(file instanceof File)) return json({ error: "no file" }, 400, origin)
      if (file.size > 25 * 1024 * 1024) return json({ error: "too large" }, 413, origin)

      const ext = file.name.match(/\.[^.]+$/)?.[0] ?? ""
      const key = `uploads/${crypto.randomUUID()}${ext}`
      await env.UPLOADS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      })
      return json(
        {
          key,
          url: `/api/file/${key}`,
          name: file.name,
          size: file.size,
          type: file.type,
        },
        200,
        origin,
      )
    }

    const fileMatch = url.pathname.match(/^\/api\/file\/(.+)$/)
    if (fileMatch && req.method === "GET") {
      const obj = await env.UPLOADS.get(fileMatch[1])
      if (!obj) return new Response("Not found", { status: 404 })
      const headers = new Headers(cors(origin))
      obj.writeHttpMetadata(headers)
      headers.set("etag", obj.httpEtag)
      headers.set("cache-control", "public, max-age=31536000, immutable")
      return new Response(obj.body, { headers })
    }

    const siteMatch = url.pathname.match(/^\/sites\/([^/]+)\/?$/)
    if (siteMatch && req.method === "GET") {
      const obj = await env.UPLOADS.get(`sites/${siteMatch[1]}/index.html`)
      if (!obj) return new Response("Site not found", { status: 404 })
      return new Response(obj.body, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      })
    }

    return new Response("Not found", { status: 404 })
  },
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors(origin) },
  })
}

function cors(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin
  }
  return headers
}
