
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { ReportFiltersComponent } from '@/components/reports/ReportFilters'
import { ReportSummary } from '@/components/reports/ReportSummary'
import { ReportTable } from '@/components/reports/ReportTable'
import { ReportChart } from '@/components/reports/ReportChart'
import { PDFExportOptions, PDFExportOptions as PDFOptions } from '@/components/reports/PDFExportOptions'
import { toast } from '@/hooks/use-toast'
import { generatePDFReport } from '@/utils/pdfGenerator'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useIsMobile } from '@/hooks/use-mobile'

export default function Relatorios() {
  const { user } = useAuth()
  const { transactions, isLoading, filters, setFilters, resetFilters, summaryData } = useReports()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const isMobile = useIsMobile()

  const clearFilters = () => {
    resetFilters()
  }

  const generatePDF = async (options: PDFOptions) => {
    setIsGeneratingPDF(true)
    
    try {
      const reportData = {
        transactions,
        summaryData,
        filters,
        userName: user?.user_metadata?.nome || user?.email || 'Usuário'
      }

      generatePDFReport(reportData, options)
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi exportado em formato PDF.",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao exportar o relatório.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const getPeriodLabel = (): string => {
    if (!filters.startDate && !filters.endDate) return 'Nenhum período selecionado'
    
    if (filters.period === 'day') return `Dia ${new Date(filters.startDate).toLocaleDateString('pt-BR')}`
    if (filters.period === 'month') return `Mês de ${new Date(filters.startDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    if (filters.period === 'year') return `Ano de ${new Date(filters.startDate).getFullYear()}`
    
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      const end = new Date(filters.endDate)
      
      // Check if it's a full month
      const isFullMonth = start.getDate() === 1 && 
        end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
        start.getMonth() === end.getMonth() &&
        start.getFullYear() === end.getFullYear()
      
      if (isFullMonth) {
        return `Mês de ${start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
      }
      
      const startStr = start.toLocaleDateString('pt-BR')
      const endStr = end.toLocaleDateString('pt-BR')
      return `Período de ${startStr} até ${endStr}`
    }
    
    return 'Período personalizado'
  }

  return (
    <PageWrapper>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Relatórios Financeiros
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Análises personalizadas das suas transações
            </p>
          </div>
          {!isMobile && (
            <PDFExportOptions
              onExport={generatePDF}
              isGenerating={isGeneratingPDF}
              disabled={transactions.length === 0}
            />
          )}
        </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

        {/* Mobile PDF Export */}
        {isMobile && transactions.length > 0 && (
          <div className="flex justify-center">
            <PDFExportOptions
              onExport={generatePDF}
              isGenerating={isGeneratingPDF}
              disabled={transactions.length === 0}
            />
          </div>
        )}

        {isLoading ? (
          <PageSkeleton cardCount={4} />
        ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo do Período: {getPeriodLabel()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportSummary
                receitas={summaryData.receitas}
                despesas={summaryData.despesas}
                saldo={summaryData.saldo}
                totalTransactions={summaryData.totalTransactions}
              />
            </CardContent>
          </Card>

          {transactions.length > 0 && (
            <>
              <ReportChart
                chartData={summaryData.chartData}
                categoryData={summaryData.byCategory}
              />

              <ReportTable transactions={transactions} />
            </>
          )}

          {transactions.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhuma transação encontrada para o período selecionado.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros acima para visualizar diferentes períodos ou categorias.
                </p>
              </CardContent>
            </Card>
          )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
