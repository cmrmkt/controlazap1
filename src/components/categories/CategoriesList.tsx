
import { Edit, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCategories, Category } from '@/hooks/useCategories';

interface CategoriesListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
}

export function CategoriesList({ categories, onEdit }: CategoriesListProps) {
  const { deleteCategory } = useCategories();

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Tag className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma categoria encontrada</h3>
          <p className="text-sm text-muted-foreground text-center">
            Crie sua primeira categoria para começar a organizar suas transações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {categories.map((category) => (
        <Card key={category.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{category.nome}</h3>
                {category.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {category.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(category)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a categoria "{category.nome}"? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteCategory(category.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
