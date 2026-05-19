import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers"
import { generateSite } from "./generate"

export type SiteWorkflowParams = {
  id: string
  answers: Record<string, unknown>
  origin: string
}

const OG_INJECT_MARKER = "</head>"

export class SiteGenerationWorkflow extends WorkflowEntrypoint<Env, SiteWorkflowParams> {
  async run(event: WorkflowEvent<SiteWorkflowParams>, step: WorkflowStep) {
    const { id, answers, origin } = event.payload

    const html = await step.do(
      "generate-html",
      { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" }, timeout: "5 minutes" },
      async () => {
        const out = await generateSite(this.env.AI, answers, origin)
        if (!out.toLowerCase().startsWith("<!doctype html>")) {
          console.error(
            "[generate-html] not HTML. length=%d preview=%s",
            out.length,
            JSON.stringify(out.slice(0, 800)),
          )
          throw new Error(`generated content is not HTML (len=${out.length})`)
        }
        return out
      },
    )

    const htmlKey = `sites/${id}/index.html`
    await step.do("put-html", async () => {
      await this.env.UPLOADS.put(htmlKey, html, {
        httpMetadata: { contentType: "text/html; charset=utf-8" },
      })
      return { key: htmlKey }
    })

    const publicOrigin = this.env.PUBLIC_ORIGIN || origin
    const siteUrl = `${publicOrigin}/sites/${id}`

    const screenshotBase64 = await step.do(
      "screenshot",
      { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" }, timeout: "1 minute" },
      async () => {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              url: siteUrl,
              viewport: { width: 1200, height: 630 },
              screenshotOptions: { type: "png", omitBackground: false },
              gotoOptions: { waitUntil: "networkidle0", timeout: 30000 },
            }),
          },
        )
        if (!res.ok) throw new Error(`screenshot failed: ${res.status} ${await res.text()}`)
        const buf = new Uint8Array(await res.arrayBuffer())
        let bin = ""
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
        return btoa(bin)
      },
    )

    const screenshotKey = `sites/${id}/og.png`
    await step.do("put-screenshot", async () => {
      const bin = atob(screenshotBase64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      await this.env.UPLOADS.put(screenshotKey, bytes, {
        httpMetadata: { contentType: "image/png" },
      })
      return { key: screenshotKey }
    })

    await step.do("inject-og-tags", async () => {
      const ogUrl = `${publicOrigin}/api/file/${screenshotKey}`
      const tags = [
        `<meta property="og:image" content="${ogUrl}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:image" content="${ogUrl}" />`,
      ].join("\n")
      const injected = html.includes(OG_INJECT_MARKER)
        ? html.replace(OG_INJECT_MARKER, `${tags}\n${OG_INJECT_MARKER}`)
        : html
      await this.env.UPLOADS.put(htmlKey, injected, {
        httpMetadata: { contentType: "text/html; charset=utf-8" },
      })
    })

    return { id, siteUrl: `/sites/${id}`, ogUrl: `/api/file/${screenshotKey}` }
  }
}
