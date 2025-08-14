import { createContext, useContext, useEffect, useState } from 'react'

export type PaletteType = 'dark' | 'ocean' | 'forest'

type PaletteContextType = {
  palette: PaletteType
  setPalette: (palette: PaletteType) => void
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined)

const palettes = {
  dark: {
    // Current dark theme colors
    '--primary': '229 84% 59%',
    '--primary-foreground': '240 10% 3.9%',
    '--secondary': '240 3.7% 15.9%',
    '--secondary-foreground': '0 0% 98%',
    '--background': '240 10% 3.9%',
    '--foreground': '0 0% 98%',
    '--card': '240 10% 3.9%',
    '--card-foreground': '0 0% 98%',
    '--muted': '240 3.7% 15.9%',
    '--muted-foreground': '240 5% 64.9%',
    '--accent': '240 3.7% 15.9%',
    '--accent-foreground': '0 0% 98%',
    '--border': '240 3.7% 15.9%',
    '--sidebar-background': '240 10% 3.9%',
    '--sidebar-foreground': '0 0% 98%',
    '--title-color': '0 0% 98%',
  },
  ocean: {
    // Ocean dark palette - inspired by dashboard blues
    '--primary': '210 100% 56%',
    '--primary-foreground': '0 0% 98%',
    '--secondary': '215 30% 18%',
    '--secondary-foreground': '210 40% 85%',
    '--background': '220 30% 8%',
    '--foreground': '210 40% 90%',
    '--card': '215 30% 12%',
    '--card-foreground': '210 40% 85%',
    '--muted': '215 30% 15%',
    '--muted-foreground': '210 20% 65%',
    '--accent': '215 30% 18%',
    '--accent-foreground': '210 40% 85%',
    '--border': '215 30% 18%',
    '--sidebar-background': '220 30% 8%',
    '--sidebar-foreground': '210 40% 90%',
    '--title-color': '210 40% 90%',
  },
  forest: {
    // Forest light palette - greens and earth tones
    '--primary': '142 76% 36%',
    '--primary-foreground': '0 0% 98%',
    '--secondary': '120 40% 95%',
    '--secondary-foreground': '140 25% 27%',
    '--background': '120 40% 98%',
    '--foreground': '140 25% 27%',
    '--card': '0 0% 100%',
    '--card-foreground': '140 25% 27%',
    '--muted': '120 40% 95%',
    '--muted-foreground': '140 16% 47%',
    '--accent': '142 76% 95%',
    '--accent-foreground': '142 76% 25%',
    '--border': '120 32% 91%',
    '--sidebar-background': '125 40% 97%',
    '--sidebar-foreground': '140 25% 27%',
    '--title-color': '140 25% 27%',
  }
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<PaletteType>(() => {
    const stored = localStorage.getItem('financeflow-palette')
    return (stored as PaletteType) || 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    const paletteColors = palettes[palette]

    // Apply the palette colors
    Object.entries(paletteColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // Store the palette preference
    localStorage.setItem('financeflow-palette', palette)
  }, [palette])

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  )
}

export function usePalette() {
  const context = useContext(PaletteContext)
  if (context === undefined) {
    throw new Error('usePalette must be used within a PaletteProvider')
  }
  return context
}