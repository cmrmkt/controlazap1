import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/utils/currency'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  userid: string | null
  categorias?: {
    id: string
    nome: string
  }
}

interface DashboardChartsProps {
  transacoes: Transacao[]
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

export function DashboardCharts({ transacoes }: DashboardChartsProps) {
  const getCategoryExpenseData = () => {
    const categorias: { [key: string]: number } = {}
    
    transacoes.forEach(t => {
      if (t.categorias?.nome && t.valor && t.tipo === 'despesa') {
        const valor = Math.abs(Number(t.valor))
        categorias[t.categorias.nome] = (categorias[t.categorias.nome] || 0) + valor
      }
    })

    return Object.entries(categorias)
      .map(([categoria, valor]) => ({
        categoria: categoria.length > 15 ? categoria.substring(0, 15) + '...' : categoria,
        valor: Math.round(valor * 100) / 100
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6) // Top 6 categorias
  }

  const getIncomeVsExpenseData = () => {
    const receitas = transacoes
      .filter(t => t.tipo === 'receita' && t.valor)
      .reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0)
    
    const despesas = transacoes
      .filter(t => t.tipo === 'despesa' && t.valor)
      .reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0)

    return [
      { 
        name: 'Receitas', 
        valor: Math.round(receitas * 100) / 100,
        fill: '#10b981'
      },
      { 
        name: 'Despesas', 
        valor: Math.round(despesas * 100) / 100,
        fill: '#ef4444'
      }
    ]
  }

  const categoryData = getCategoryExpenseData()
  const incomeExpenseData = getIncomeVsExpenseData()
  const hasData = transacoes.length > 0

  if (!hasData) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Análise Financeira</CardTitle>
            <CardDescription>
              Adicione transações para ver seus gráficos e análises
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">Nenhuma transação encontrada</p>
                <p className="text-sm">Comece adicionando suas receitas e despesas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Gastos por Categoria */}
      <Card className="group bg-gradient-to-br from-background to-muted/20 border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            📊 Gastos por Categoria
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Principais categorias de despesas do período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="categoria" 
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[340px] text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <p>Nenhuma despesa categorizada encontrada</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receitas vs Despesas */}
      <Card className="group bg-gradient-to-br from-background to-muted/20 border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold bg-gradient-to-r from-emerald-600 to-red-600 bg-clip-text text-transparent">
            💰 Receitas vs Despesas
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Comparação entre entradas e saídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomeExpenseData.some(item => item.valor > 0) ? (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="receitaGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981"/>
                      <stop offset="100%" stopColor="#059669"/>
                    </linearGradient>
                    <linearGradient id="despesaGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ef4444"/>
                      <stop offset="100%" stopColor="#dc2626"/>
                    </linearGradient>
                  </defs>
                  <Pie
                    data={incomeExpenseData.map((item, index) => ({
                      ...item,
                      fill: index === 0 ? 'url(#receitaGradient)' : 'url(#despesaGradient)'
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    dataKey="valor"
                  >
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      <span style={{ color: 'white', fontWeight: 'bold' }}>
                        {formatCurrency(value)}
                      </span>, 
                      <span style={{ color: 'white' }}>{name}</span>
                    ]}
                    labelStyle={{ 
                      color: 'white', 
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)',
                      color: 'white'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value, entry: any) => (
                      <span>
                        <span style={{ color: entry.color, fontWeight: '600' }}>
                          {value}:
                        </span>
                        <span style={{ color: 'hsl(var(--foreground))', fontWeight: '600', marginLeft: '4px' }}>
                          {formatCurrency(entry.payload?.valor || 0)}
                        </span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[340px] text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <p>Adicione receitas e despesas para ver a comparação</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card className="md:col-span-2 bg-gradient-to-br from-background via-background to-muted/10 border-border/50">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            📈 Resumo do Período
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Análise detalhada das suas finanças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto mb-3 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Total de Receitas</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(incomeExpenseData[0]?.valor || 0)}
                </p>
              </div>
            </div>
            
            <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-red-500/10 to-red-600/20 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(incomeExpenseData[1]?.valor || 0)}
                </p>
              </div>
            </div>
            
            <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Saldo do Período</p>
                <p className={`text-2xl font-bold ${
                  ((incomeExpenseData[0]?.valor || 0) - (incomeExpenseData[1]?.valor || 0)) >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency((incomeExpenseData[0]?.valor || 0) - (incomeExpenseData[1]?.valor || 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total de Transações:</span>
              <span className="text-lg font-bold text-foreground">{transacoes.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}