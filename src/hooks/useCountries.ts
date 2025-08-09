
import { useState, useEffect } from 'react'

export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
}

export function useCountries() {
  const [countries] = useState<Country[]>([
    { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
    { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾' },
    { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾' },
    { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴' },
    { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
    { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
    { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
    { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
    { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
    { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
  ])

  return { countries }
}
