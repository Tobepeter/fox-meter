import { ThemeProvider as NextThemeProvider, type ThemeProviderProps } from 'next-themes'

// 应用主题上下文
export function ThemeProvider(props: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="fox-meter-theme"
      {...props}
    />
  )
}
