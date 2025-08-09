
export const formatPhoneDisplay = (phone: string, countryCode?: string): string => {
  if (!phone) return ''
  
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '')
  
  // Se não tem código do país, assume que é brasileiro
  const code = countryCode || '55'
  
  // Formatação para número brasileiro
  if (code === '55' || code === '+55') {
    if (numbers.length === 11) {
      // Celular com 9 dígitos: (11) 99999-9999
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (numbers.length === 10) {
      // Fixo: (11) 9999-9999
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
  }
  
  // Para outros países, exibir com código do país
  return `+${code} ${numbers}`
}

export const parsePhoneFromDisplay = (formattedPhone: string): { countryCode: string; phone: string } => {
  // Remove formatação e extrai números
  const numbers = formattedPhone.replace(/\D/g, '')
  
  // Se começa com 55 e tem 13 dígitos (55 + 11 dígitos), é brasileiro
  if (numbers.startsWith('55') && numbers.length === 13) {
    return {
      countryCode: '55',
      phone: numbers.substring(2)
    }
  }
  
  // Se tem 11 dígitos, assume brasileiro sem código
  if (numbers.length === 11 || numbers.length === 10) {
    return {
      countryCode: '55',
      phone: numbers
    }
  }
  
  // Para outros formatos, tenta extrair código do país
  if (formattedPhone.includes('+')) {
    const parts = formattedPhone.split(' ')
    const code = parts[0].replace('+', '')
    const phone = parts.slice(1).join('').replace(/\D/g, '')
    return {
      countryCode: code,
      phone: phone
    }
  }
  
  return {
    countryCode: '55',
    phone: numbers
  }
}
