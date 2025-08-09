
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoriesList } from '@/components/categories/CategoriesList';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useCategories } from '@/hooks/useCategories';

export default function Categorias() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { categories, isLoading } = useCategories();

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Categorias
          </h1>
          <p className="text-muted-foreground/80">
            Organize suas transações com categorias personalizadas no estilo futurista
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gradient-primary hover-lift shadow-lg shadow-primary/30 border border-primary/30 gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <CategoriesList 
        categories={categories} 
        onEdit={handleEditCategory}
      />

      {isFormOpen && (
        <CategoryForm
          category={editingCategory}
          onClose={handleCloseForm}
        />
      )}
    </PageWrapper>
  );
}
