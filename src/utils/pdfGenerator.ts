
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency } from './currency'
import { ReportTransaction } from '@/hooks/useReports'
import { PDFExportOptions } from '@/components/reports/PDFExportOptions'

// Estendendo o tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface PDFReportData {
  transactions: ReportTransaction[]
  summaryData: {
    receitas: number
    despesas: number
    saldo: number
    totalTransactions: number
    byCategory: Record<string, { receitas: number; despesas: number; total: number }>
    chartData: Array<{ name: string; value: number; color: string }>
  }
  filters: {
    startDate: string
    endDate: string
    type: string
    categoryId: string
    period: string
  }
  userName: string
}

export const generatePDFReport = (data: PDFReportData, options: PDFExportOptions) => {
  const doc = new jsPDF()
  
  // Configurações
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  let yPosition = margin
  let currentPage = 1
  const primaryColor = [66, 139, 202] // Azul da plataforma
  const successColor = [34, 197, 94] // Verde para receitas
  const dangerColor = [239, 68, 68] // Vermelho para despesas

  // Função para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      currentPage++
      yPosition = margin
      return true
    }
    return false
  }

  // Função para adicionar rodapé
  const addFooter = () => {
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Página ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 10)
  }

  // Cabeçalho personalizado
  const addHeader = () => {
    // Título principal
    doc.setFontSize(24)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Linha decorativa
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 15

    // Informações do cabeçalho
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    
    const headerInfo = [
      `Usuário: ${data.userName}`,
      `Data de geração: ${new Date().toLocaleString('pt-BR')}`,
      `Período: ${getPeriodText()}`,
      `Tipo: ${getTransactionTypeText()}`
    ]

    headerInfo.forEach(info => {
      doc.text(info, margin, yPosition)
      yPosition += 8
    })

    yPosition += 10
  }

  // Função para obter texto do período
  const getPeriodText = () => {
    switch (data.filters.period) {
      case 'day': return 'Hoje'
      case 'month': return 'Este Mês'
      case 'year': return 'Este Ano'
      case 'custom':
        return data.filters.startDate && data.filters.endDate 
          ? `${new Date(data.filters.startDate).toLocaleDateString('pt-BR')} - ${new Date(data.filters.endDate).toLocaleDateString('pt-BR')}`
          : 'Período Personalizado'
      default: return 'Todos os Períodos'
    }
  }

  // Função para obter texto do tipo de transação
  const getTransactionTypeText = () => {
    switch (options.transactionType) {
      case 'receita': return 'Somente Receitas'
      case 'despesa': return 'Somente Despesas'
      default: return 'Todas as Transações'
    }
  }

  // Filtrar transações baseado nas opções
  const filteredTransactions = data.transactions.filter(transaction => {
    if (options.transactionType === 'all') return true
    return transaction.tipo === options.transactionType
  })

  // Recalcular dados do resumo baseado nas transações filtradas
  const getFilteredSummary = () => {
    const receitas = filteredTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = filteredTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    return { receitas, despesas, saldo: receitas - despesas }
  }

  const filteredSummary = getFilteredSummary()

  // Adicionar cabeçalho
  addHeader()

  // Resumo financeiro
  if (options.includeSummary) {
    checkPageBreak(60)
    
    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RESUMO FINANCEIRO', margin, yPosition)
    yPosition += 15

    // Criar tabela de resumo
    const summaryData = []
    
    if (options.transactionType === 'all' || options.transactionType === 'receita') {
      summaryData.push(['Total de Receitas', formatCurrency(filteredSummary.receitas)])
    }
    
    if (options.transactionType === 'all' || options.transactionType === 'despesa') {
      summaryData.push(['Total de Despesas', formatCurrency(filteredSummary.despesas)])
    }
    
    if (options.transactionType === 'all') {
      summaryData.push(['Saldo Final', formatCurrency(filteredSummary.saldo)])
    }
    
    summaryData.push(['Total de Transações', filteredTransactions.length.toString()])

    doc.autoTable({
      head: [['Descrição', 'Valor']],
      body: summaryData,
      startY: yPosition,
      styles: { fontSize: 11, cellPadding: 5 },
      headStyles: { 
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap'
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Resumo por categoria
  if (options.includeSummary && Object.keys(data.summaryData.byCategory).length > 0) {
    checkPageBreak(80)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RESUMO POR CATEGORIA', margin, yPosition)
    yPosition += 15

    const categoryData = Object.entries(data.summaryData.byCategory)
      .filter(([_, categoryData]) => {
        if (options.transactionType === 'receita') return categoryData.receitas > 0
        if (options.transactionType === 'despesa') return categoryData.despesas > 0
        return categoryData.receitas > 0 || categoryData.despesas > 0
      })
      .map(([name, categoryData]) => {
        const row = [name]
        if (options.transactionType === 'all' || options.transactionType === 'receita') {
          row.push(formatCurrency(categoryData.receitas))
        }
        if (options.transactionType === 'all' || options.transactionType === 'despesa') {
          row.push(formatCurrency(categoryData.despesas))
        }
        if (options.transactionType === 'all') {
          row.push(formatCurrency(categoryData.total))
        }
        return row
      })

    if (categoryData.length > 0) {
      const headers = ['Categoria']
      if (options.transactionType === 'all' || options.transactionType === 'receita') {
        headers.push('Receitas')
      }
      if (options.transactionType === 'all' || options.transactionType === 'despesa') {
        headers.push('Despesas')
      }
      if (options.transactionType === 'all') {
        headers.push('Saldo')
      }

      doc.autoTable({
        head: [headers],
        body: categoryData,
        startY: yPosition,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { 
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 20
    }
  }

  // Gráficos (simulação textual)
  if (options.includeCharts && data.summaryData.chartData.length > 0) {
    checkPageBreak(100)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('DISTRIBUIÇÃO POR TIPO', margin, yPosition)
    yPosition += 15

    // Simular gráfico de pizza com texto
    const total = data.summaryData.chartData.reduce((acc, item) => acc + item.value, 0)
    
    data.summaryData.chartData
      .filter(item => {
        if (options.transactionType === 'receita') return item.name === 'Receitas'
        if (options.transactionType === 'despesa') return item.name === 'Despesas'
        return true
      })
      .forEach(item => {
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text(`${item.name}: ${formatCurrency(item.value)} (${percentage}%)`, margin + 10, yPosition)
        yPosition += 8
      })

    yPosition += 15
  }

  // Detalhes das transações
  if (options.includeDetails && filteredTransactions.length > 0) {
    checkPageBreak(60)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('DETALHES DAS TRANSAÇÕES', margin, yPosition)
    yPosition += 15

    const tableData = filteredTransactions.map(transaction => [
      transaction.quando ? new Date(transaction.quando).toLocaleDateString('pt-BR') : '-',
      transaction.estabelecimento || 'Sem estabelecimento',
      transaction.categorias?.nome || 'Sem categoria',
      transaction.tipo || '-',
      `${transaction.tipo === 'receita' ? '+' : '-'}${formatCurrency(Math.abs(transaction.valor || 0))}`
    ])

    doc.autoTable({
      head: [['Data', 'Estabelecimento', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        4: { halign: 'right' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        currentPage++
        addFooter()
      }
    })
  } else {
    addFooter()
  }

  // Salvar o PDF
  const typeText = options.transactionType === 'all' ? 'completo' : options.transactionType
  const fileName = `relatorio-financeiro-${typeText}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
