import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePalette, type PaletteType } from '@/contexts/PaletteContext'

const paletteOptions = [
  { 
    value: 'dark' as PaletteType, 
    label: 'Escuro', 
    description: 'Tema escuro futurista',
    colors: ['hsl(229 84% 59%)', 'hsl(240 10% 3.9%)', 'hsl(240 3.7% 15.9%)']
  },
  { 
    value: 'ocean' as PaletteType, 
    label: 'Oceano', 
    description: 'Tons azuis profundos',
    colors: ['hsl(210 100% 56%)', 'hsl(220 30% 8%)', 'hsl(215 30% 12%)']
  },
  { 
    value: 'forest' as PaletteType, 
    label: 'Floresta', 
    description: 'Tons verdes naturais',
    colors: ['hsl(142 76% 36%)', 'hsl(120 40% 98%)', 'hsl(142 76% 95%)']
  },
]

export function PaletteSwitcher() {
  const { palette, setPalette } = usePalette()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Alterar paleta de cores</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg">
        {paletteOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setPalette(option.value)}
            className={`cursor-pointer p-3 ${
              palette === option.value ? 'bg-accent font-medium' : ''
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex gap-1">
                {option.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded border border-border/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-sm">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}