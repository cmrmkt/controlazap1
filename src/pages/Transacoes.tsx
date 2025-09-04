
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TransactionSummaryCards } from '@/components/transactions/TransactionSummaryCards'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime'
import { useCategories } from '@/hooks/useCategories'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

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

export default function Transacoes() {
  const { user } = useAuth()
  const { categories } = useCategories()
  const isMobile = useIsMobile()
  useGlobalRealtime() // Ativar sistema de realtime otimizado
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [formData, setFormData] = useState({
    quando: '',
    estabelecimento: '',
    valor: 0,
    detalhes: '',
    tipo: '',
    category_id: '',
  })

  useEffect(() => {
    if (user) {
      fetchTransacoes()
      
      // Implementar listener para atualizações de transações via realtime
      let lastUpdateTime = 0;
      const handleTransactionsUpdate = (event: CustomEvent) => {
        const { eventType, new: newData, old: oldData } = event.detail;
        console.log('[TRANSACOES] Realtime update received:', { eventType, newData, oldData });
        
        // Debounce para evitar atualizações duplicadas - aumentado para 1500ms
        const now = Date.now();
        if (lastUpdateTime && now - lastUpdateTime < 1500) {
          return;
        }
        lastUpdateTime = now;
        
        if (eventType === 'UPDATE' && newData) {
          setTransacoes(prev => 
            prev.map(t => t.id === newData.id ? { ...t, ...newData as Transacao } : t)
          );
        } else if (eventType === 'DELETE' && oldData) {
          setTransacoes(prev => prev.filter(t => t.id !== oldData.id));
        } else if (eventType === 'INSERT' && newData) {
          setTransacoes(prev => [newData as Transacao, ...prev]);
        }
      };

      window.addEventListener('transactions-updated', handleTransactionsUpdate);
      
      return () => {
        window.removeEventListener('transactions-updated', handleTransactionsUpdate);
      };
    }
  }, [user])

  // Transações filtradas
  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(transacao => {
      const matchesSearch = !searchTerm || 
        (transacao.estabelecimento?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      const matchesType = !typeFilter || transacao.tipo === typeFilter
      const matchesCategory = !categoryFilter || transacao.category_id === categoryFilter
      
      return matchesSearch && matchesType && matchesCategory
    })
  }, [transacoes, searchTerm, typeFilter, categoryFilter])

  // Cálculo dos totais
  const { receitas, despesas, saldo } = useMemo(() => {
    const receitas = filteredTransacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = filteredTransacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    return {
      receitas,
      despesas,
      saldo: receitas - despesas
    }
  }, [filteredTransacoes])

  const fetchTransacoes = async () => {
    try {
      console.log('Fetching transações for user:', user?.id)
      
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          )
        `)
        .eq('userid', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar transações:', error)
        throw error
      }
      
      console.log('Transações carregadas:', data?.length)
      setTransacoes(data || [])
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('')
    setCategoryFilter('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação obrigatória de categoria
    if (!formData.category_id) {
      toast({
        title: "Categoria obrigatória",
        description: "Por favor, selecione uma categoria para a transação.",
        variant: "destructive",
      })
      return
    }

    // Validação: verificar se a categoria selecionada pertence ao usuário
    const categoryBelongsToUser = categories?.some(cat => cat.id === formData.category_id)
    if (!categoryBelongsToUser) {
      toast({
        title: "Erro de validação",
        description: "A categoria selecionada não é válida para este usuário.",
        variant: "destructive",
      })
      return
    }

    // Validação de tipo
    if (!formData.tipo) {
      toast({
        title: "Tipo obrigatório",
        description: "Por favor, selecione o tipo da transação (receita ou despesa).",
        variant: "destructive",
      })
      return
    }

    // Validação de valor
    if (!formData.valor || formData.valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, informe um valor maior que zero.",
        variant: "destructive",
      })
      return
    }

    try {
      const transacaoData = {
        quando: formData.quando,
        estabelecimento: formData.estabelecimento,
        valor: formData.valor,
        detalhes: formData.detalhes,
        tipo: formData.tipo,
        category_id: formData.category_id,
        userid: user?.id,
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transacaoData)
          .eq('id', editingTransaction.id)

        if (error) throw error
        toast({ title: "Transação atualizada com sucesso!" })
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert([transacaoData])

        if (error) throw error
        toast({ title: "Transação adicionada com sucesso!" })
      }

      setDialogOpen(false)
      setEditingTransaction(null)
      setFormData({
        quando: '',
        estabelecimento: '',
        valor: 0,
        detalhes: '',
        tipo: '',
        category_id: '',
      })
      // fetchTransacoes() removido - o realtime vai atualizar automaticamente
    } catch (error: any) {
      toast({
        title: "Erro ao salvar transação",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (transacao: Transacao) => {
    setEditingTransaction(transacao)
    setFormData({
      quando: transacao.quando || '',
      estabelecimento: transacao.estabelecimento || '',
      valor: transacao.valor || 0,
      detalhes: transacao.detalhes || '',
      tipo: transacao.tipo || '',
      category_id: transacao.category_id || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: "Transação excluída com sucesso!" })
      // fetchTransacoes() removido - o realtime vai atualizar automaticamente
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('userid', user?.id)

      if (error) throw error
      toast({ title: "Todas as transações foram excluídas com sucesso!" })
      // fetchTransacoes() removido - o realtime vai atualizar automaticamente
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transações",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <PageWrapper>
      {/* Mobile Layout */}
      {isMobile ? (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Transações
            </h2>
            <p className="text-muted-foreground/80">Gerencie suas receitas e despesas com estilo futurista</p>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {transacoes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="border-destructive/30 hover:border-destructive min-h-[44px]">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover Todas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-destructive/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Remover todas as transações</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá remover permanentemente todas as suas transações.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover-lift">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover-lift">
                      Remover Todas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary hover-lift shadow-lg shadow-primary/30 border border-primary/30 min-h-[44px]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] glass-card border-primary/30">
                <DialogHeader>
                  <DialogTitle className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTransaction 
                      ? 'Faça as alterações necessárias na transação.' 
                      : 'Adicione uma nova receita ou despesa.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor</Label>
                      <CurrencyInput
                        value={formData.valor}
                        onChange={(value) => setFormData({...formData, valor: value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estabelecimento">Estabelecimento</Label>
                    <Input
                      id="estabelecimento"
                      placeholder="Ex: Supermercado, Salário, etc."
                      value={formData.estabelecimento}
                      onChange={(e) => setFormData({...formData, estabelecimento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <CategorySelector
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({...formData, category_id: value})}
                      placeholder="Selecione a categoria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quando">Data</Label>
                    <Input
                      id="quando"
                      type="date"
                      value={formData.quando}
                      onChange={(e) => setFormData({...formData, quando: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detalhes">Detalhes</Label>
                    <Textarea
                      id="detalhes"
                      placeholder="Informações adicionais..."
                      value={formData.detalhes}
                      onChange={(e) => setFormData({...formData, detalhes: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary hover-lift shadow-lg shadow-primary/30">
                    {editingTransaction ? 'Atualizar' : 'Adicionar'} Transação
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        /* Desktop Layout */
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Transações
            </h2>
            <p className="text-muted-foreground/80">Gerencie suas receitas e despesas com estilo futurista</p>
          </div>
          <div className="flex gap-3">
            {transacoes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gradient-card-hover border-destructive/30 hover:border-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover Todas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-destructive/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Remover todas as transações</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá remover permanentemente todas as suas transações.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover-lift">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover-lift">
                      Remover Todas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary hover-lift shadow-lg shadow-primary/30 border border-primary/30">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] glass-card border-primary/30">
                <DialogHeader>
                  <DialogTitle className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTransaction 
                      ? 'Faça as alterações necessárias na transação.' 
                      : 'Adicione uma nova receita ou despesa.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor</Label>
                      <CurrencyInput
                        value={formData.valor}
                        onChange={(value) => setFormData({...formData, valor: value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estabelecimento">Estabelecimento</Label>
                    <Input
                      id="estabelecimento"
                      placeholder="Ex: Supermercado, Salário, etc."
                      value={formData.estabelecimento}
                      onChange={(e) => setFormData({...formData, estabelecimento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <CategorySelector
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({...formData, category_id: value})}
                      placeholder="Selecione a categoria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quando">Data</Label>
                    <Input
                      id="quando"
                      type="date"
                      value={formData.quando}
                      onChange={(e) => setFormData({...formData, quando: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detalhes">Detalhes</Label>
                    <Textarea
                      id="detalhes"
                      placeholder="Informações adicionais..."
                      value={formData.detalhes}
                      onChange={(e) => setFormData({...formData, detalhes: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary hover-lift shadow-lg shadow-primary/30">
                    {editingTransaction ? 'Atualizar' : 'Adicionar'} Transação
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <TransactionSummaryCards 
        receitas={receitas}
        despesas={despesas}
        saldo={saldo}
      />

      <TransactionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onClearFilters={clearFilters}
      />

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTransacoes.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {transacoes.length === 0 ? 'Nenhuma transação encontrada' : 'Nenhuma transação encontrada com os filtros aplicados'}
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gradient-primary hover-lift shadow-lg shadow-primary/30">
                Adicionar primeira transação
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTransacoes.map((transacao, index) => (
            <Card key={transacao.id} className="gradient-card-hover animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {transacao.tipo === 'receita' ? (
                        <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-red-500/20 text-red-400">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground">
                        {transacao.estabelecimento || 'Sem estabelecimento'}
                      </h3>
                      <Badge 
                        variant={transacao.tipo === 'receita' ? 'default' : 'destructive'}
                        className={`${transacao.tipo === 'receita' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        } hover:shadow-lg transition-all duration-200`}
                      >
                        {transacao.tipo}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {transacao.categorias && (
                        <p>Categoria: {transacao.categorias.nome}</p>
                      )}
                      {transacao.quando && (
                        <p>Data: {formatDate(transacao.quando)}</p>
                      )}
                      {transacao.detalhes && (
                        <p>Detalhes: {transacao.detalhes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-xl font-bold ${
                      transacao.tipo === 'receita' 
                        ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                        : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`}>
                      {transacao.tipo === 'receita' ? '+' : '-'}
                      {formatCurrency(Math.abs(transacao.valor || 0))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(transacao)}
                        className="border-primary/30 text-primary hover:bg-primary/20 hover:border-primary hover-lift shadow-lg shadow-primary/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(transacao.id)}
                        className="border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive hover-lift shadow-lg shadow-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageWrapper>
  )
}
