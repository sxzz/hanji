declare module '*?raw' {
  const content: string
  export default content
}

declare module '*?url' {
  const url: string
  export default url
}

declare module '*?no-inline' {
  const url: string
  export default url
}

declare module '*?url&no-inline' {
  const url: string
  export default url
}

interface ImportMeta {
  glob: <T = unknown>(
    pattern: string | readonly string[],
    options?: {
      eager?: boolean
      import?: string
      query?: string | Record<string, string | number | boolean>
    },
  ) => Record<string, T>
}
