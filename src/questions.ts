export type Question =
  | {
      id: string
      kind: "short_text"
      prompt: string
      hint?: string
      placeholder?: string
      required?: boolean
    }
  | {
      id: string
      kind: "long_text"
      prompt: string
      hint?: string
      placeholder?: string
      required?: boolean
    }
  | {
      id: string
      kind: "color"
      prompt: string
      hint?: string
      max?: number
      required?: boolean
    }
  | {
      id: string
      kind: "image_upload"
      prompt: string
      hint?: string
      multiple?: boolean
      required?: boolean
    }
  | {
      id: string
      kind: "single_select"
      prompt: string
      hint?: string
      options: { value: string; label: string; blurb?: string }[]
      required?: boolean
    }
  | {
      id: string
      kind: "multi_select"
      prompt: string
      hint?: string
      options: { value: string; label: string; blurb?: string }[]
      required?: boolean
    }

export type UploadedFile = {
  key: string
  url: string
  name: string
  type: string
  size: number
}

export type AnswerValue = string | string[] | UploadedFile[]

export type Answers = Record<string, AnswerValue>

export const questions: Question[] = [
  {
    id: "business_name",
    kind: "short_text",
    prompt: "What is the name of your business?",
    hint: "The name as you'd want it to appear on the site.",
    placeholder: "e.g. Cedar & Stone",
    required: true,
  },
  {
    id: "business_what",
    kind: "long_text",
    prompt: "In a few sentences, what does it do?",
    hint: "Imagine telling a stranger at a dinner party.",
    placeholder: "We design and build…",
    required: true,
  },
  {
    id: "audience",
    kind: "short_text",
    prompt: "Who is it for?",
    hint: "Your ideal customer or visitor.",
    placeholder: "e.g. independent restaurant owners",
  },
  {
    id: "vibe",
    kind: "single_select",
    prompt: "Pick a vibe.",
    hint: "We can blend later. Start with the one that's closest.",
    options: [
      {
        value: "editorial",
        label: "Editorial",
        blurb: "Serif type, calm whitespace, magazine-like.",
      },
      { value: "brutalist", label: "Brutalist", blurb: "Raw, mono, unapologetic grids." },
      { value: "playful", label: "Playful", blurb: "Color, motion, rounded forms." },
      { value: "luxury", label: "Luxury", blurb: "Restrained, dark, gilded accents." },
      { value: "organic", label: "Organic", blurb: "Earthy palette, soft shapes." },
      { value: "technical", label: "Technical", blurb: "Dense, precise, schematic." },
    ],
    required: true,
  },
  {
    id: "colors",
    kind: "color",
    prompt: "Choose your colors.",
    hint: "Up to four. Hover a swatch to remove it.",
    max: 4,
  },
  {
    id: "logo",
    kind: "image_upload",
    prompt: "Upload your logo, if you have one.",
    hint: "SVG, PNG, or JPG. Skip if you don't.",
    multiple: false,
  },
  {
    id: "imagery",
    kind: "image_upload",
    prompt: "Any reference images?",
    hint: "Photos, sites you love, mood, anything.",
    multiple: true,
  },
  {
    id: "pages",
    kind: "multi_select",
    prompt: "Which pages do you need?",
    options: [
      { value: "home", label: "Home" },
      { value: "about", label: "About" },
      { value: "work", label: "Work / Portfolio" },
      { value: "shop", label: "Shop" },
      { value: "blog", label: "Journal / Blog" },
      { value: "contact", label: "Contact" },
      { value: "booking", label: "Booking" },
      { value: "menu", label: "Menu" },
    ],
    required: true,
  },
  {
    id: "features",
    kind: "multi_select",
    prompt: "Which features matter?",
    options: [
      { value: "newsletter", label: "Newsletter signup" },
      { value: "cms", label: "CMS so you can edit" },
      { value: "ecom", label: "E-commerce" },
      { value: "booking", label: "Booking / scheduling" },
      { value: "i18n", label: "Multiple languages" },
      { value: "search", label: "Search" },
      { value: "auth", label: "Login / accounts" },
      { value: "analytics", label: "Analytics" },
    ],
  },
  {
    id: "deadline",
    kind: "short_text",
    prompt: "Any deadline?",
    hint: "A launch date, an event, or 'whenever'.",
    placeholder: "e.g. before March",
  },
  {
    id: "notes",
    kind: "long_text",
    prompt: "Anything else we should know?",
    placeholder: "References, must-haves, things to avoid…",
  },
]
