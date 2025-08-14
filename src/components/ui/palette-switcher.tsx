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
  { value: 'dark' as PaletteType, label: 'Escuro', description: 'Tema escuro futurista' },
  { value: 'ocean' as PaletteType, label: 'Oceano', description: 'Tons azuis claros' },
  { value: 'forest' as PaletteType, label: 'Floresta', description: 'Tons verdes naturais' },
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
      <DropdownMenuContent align="end" className="w-48">
        {paletteOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setPalette(option.value)}
            className={`cursor-pointer ${
              palette === option.value ? 'bg-accent font-medium' : ''
            }`}
          >
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}