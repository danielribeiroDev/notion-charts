import { useParams } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/card';

// Demo data for different chart types
const barData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
];

const lineData = [
  { name: 'Week 1', value: 2400 },
  { name: 'Week 2', value: 1398 },
  { name: 'Week 3', value: 9800 },
  { name: 'Week 4', value: 3908 },
  { name: 'Week 5', value: 4800 },
  { name: 'Week 6', value: 3800 },
];

const pieData = [
  { name: 'Category A', value: 400 },
  { name: 'Category B', value: 300 },
  { name: 'Category C', value: 200 },
  { name: 'Category D', value: 100 },
];

const COLORS = ['hsl(142, 76%, 46%)', 'hsl(142, 76%, 36%)', 'hsl(142, 50%, 30%)', 'hsl(142, 40%, 25%)'];

export default function EmbedChart() {
  const { chartId } = useParams<{ chartId: string }>();
  const { charts } = useAppStore();

  const chart = charts.find((c) => c.id === chartId);

  if (!chart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Gráfico não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderChart = () => {
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }} 
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'stats':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-secondary/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">$45,231.89</p>
                <div className="mt-2 flex items-center text-sm text-primary">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  +20.1% from last month
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Subscriptions</p>
                <p className="text-3xl font-bold">+2,350</p>
                <div className="mt-2 flex items-center text-sm text-destructive">
                  <TrendingDown className="mr-1 h-4 w-4" />
                  -4.5% from last month
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <h2 className="mb-6 text-xl font-semibold">{chart.name}</h2>
          {renderChart()}
        </CardContent>
      </Card>
    </div>
  );
}
