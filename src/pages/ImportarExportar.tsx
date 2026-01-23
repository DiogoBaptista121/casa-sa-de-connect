import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, Users, FileDown, FileUp } from 'lucide-react';

export default function ImportarExportarPage() {
  const navigate = useNavigate();

  const sections = [
    { title: 'Cartão de Saúde', icon: CreditCard, path: '/cartao-saude', desc: 'Importar/exportar aderentes' },
    { title: 'Consultas', icon: Calendar, path: '/consultas', desc: 'Importar/exportar marcações' },
    { title: 'Funcionários MT', icon: Users, path: '/medicina-trabalho', desc: 'Importar/exportar funcionários' },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Importar / Exportar"
        description="Atalhos para importação e exportação de dados em Excel"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <section.icon className="w-5 h-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate(section.path)}>
                <FileUp className="w-4 h-4" /> Importar
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => navigate(section.path)}>
                <FileDown className="w-4 h-4" /> Exportar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
