const SYSTEM_PROMPT = `You are a senior web designer and front-end developer who builds preview marketing websites for new clients.

Your job: given a client's intake answers, produce ONE self-contained \`index.html\` file that previews their site. The client is shown this preview as a first taste of what their real site could look like.

REQUIREMENTS:
- Output a single complete HTML document, starting with \`<!doctype html>\` and ending with \`</html>\`.
- Use Tailwind via this exact script tag in the <head>: <script src="https://unpkg.com/@tailwindcss/browser"></script>
- Use Phosphor Icons for any icon needs (nav, buttons, social links, feature lists, etc.). Include this exact stylesheet in the <head>: <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web/src/regular/style.css" />. Render icons with <i class="ph ph-<name>"></i> — for example <i class="ph ph-shopping-cart"></i>, <i class="ph ph-envelope"></i>, <i class="ph ph-instagram-logo"></i>. Size and color them with Tailwind classes like text-2xl text-brand. Only the regular weight is loaded; don't use ph-bold/ph-fill/etc.
- All styling must be done with Tailwind utility classes. Do not include a <style> block except for one optional small block defining a font-family or a CSS custom property if needed.
- Pull the client's chosen colors into Tailwind via the \`@theme\` directive in a <style type="text/tailwindcss"> block, then use those theme colors via utility classes. Example:
  <style type="text/tailwindcss">
    @theme {
      --color-brand: #b8341d;
      --color-ink: #161310;
    }
  </style>
  Then use \`bg-brand\`, \`text-ink\`, etc.
- Use the client's uploaded images by their provided URL. The logo (if any) goes in the header. Reference images can be used as hero images, gallery items, or background images as appropriate.
- Build the pages the client requested. For a single-page preview, render each requested page as a section on one long page with anchor links in a top nav.
- Match the chosen "vibe" in your visual choices: typography, spacing, density, color usage, imagery treatment.
- Pick a tasteful Google Font that matches the vibe and load it via a <link> tag in the head. Editorial → serif (Fraunces, Cormorant). Brutalist → mono (JetBrains Mono, Space Mono). Playful → rounded (Quicksand, Nunito). Luxury → high-contrast serif (Playfair, Cormorant). Organic → humanist sans (Work Sans, Karla). Technical → mono or geometric sans (IBM Plex Mono, Inter Tight).
- Include real content informed by the business description — do not use lorem ipsum. Write tagline, about copy, and section copy that actually reflects what the business does.
- Implement the requested features as visible UI: newsletter signup → form; ecommerce → product grid; booking → CTA + form; menu → menu section; etc. The form actions can be \`#\` — these are previews.
- Make it responsive. Mobile-first.
- Subtle motion is welcome (hover transitions, smooth scroll). No heavy JS frameworks.
- The result should feel like a real, polished site — not a template.

OUTPUT FORMAT:
Return ONLY the raw HTML. No markdown fences, no preamble, no explanation. The first characters of your response must be \`<!doctype html>\`.`

type IntakeAnswers = Record<string, unknown>

function buildUserMessage(answers: IntakeAnswers, origin: string): string {
  const lines: string[] = ["Here is the client's intake. Build their preview site.\n"]
  for (const [key, value] of Object.entries(answers)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue
    lines.push(`## ${key}`)
    if (Array.isArray(value)) {
      const first = value[0] as { url?: string; name?: string } | string
      if (typeof first === "object" && first && "url" in first) {
        for (const f of value as { url: string; name: string }[]) {
          lines.push(`- ${f.name}: ${origin}${f.url}`)
        }
      } else {
        for (const v of value) lines.push(`- ${v}`)
      }
    } else {
      lines.push(String(value))
    }
    lines.push("")
  }
  return lines.join("\n")
}

export async function generateSite(
  ai: Ai,
  answers: IntakeAnswers,
  origin: string,
): Promise<string> {
  const response = await ai.run("@cf/moonshotai/kimi-k2.6", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(answers, origin) },
    ],
    max_tokens: 64000,
  })

  const r = response as {
    response?: string
    choices?: { message?: { content?: string }; text?: string }[]
  }
  const text =
    r.response ??
    r.choices?.[0]?.message?.content ??
    r.choices?.[0]?.text ??
    ""

  if (!text) {
    console.error("[generate] empty text. keys=%s", Object.keys(response ?? {}).join(","))
  }

  return stripFences(text).trim()
}

function stripFences(s: string): string {
  const fence = s.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/i)
  return fence ? fence[1] : s
}
