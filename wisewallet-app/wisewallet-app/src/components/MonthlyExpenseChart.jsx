import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { supabase } from '../supabaseClient';
import './MonthlyExpenseChart.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const MonthlyExpenseChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Buscar todas as transações do utilizador
        const { data: allTransactions, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, expense_date, category_id')
          .eq('user_id', user.id);

        if (expensesError) throw expensesError;

        // 2. Buscar categorias para identificar o rendimento
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
        if (categoriesError) throw categoriesError;

        const incomeCategory = categoriesData.find(cat => cat.name.trim().toLowerCase() === 'income');
        const incomeCategoryId = incomeCategory ? incomeCategory.id : null;

        // 3. Agrupar transações por mês
        const monthlyTotals = allTransactions.reduce((acc, item) => {
          const date = new Date(item.expense_date);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });

          if (!acc[monthYear]) {
            acc[monthYear] = { income: 0, expense: 0 };
          }

          if (item.category_id === incomeCategoryId) {
            acc[monthYear].income += item.amount;
          } else {
            acc[monthYear].expense += item.amount;
          }
          return acc;
        }, {});

        // 4. Ordenar os meses cronologicamente
        const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => new Date(a) - new Date(b));

        if (sortedMonths.length === 0) {
          setLoading(false);
          return;
        }

        // 5. Função para preparar os dados do gráfico com base no tipo
        const generateChartData = (type) => {
          const isBarChart = type === 'bar';
          return {
            labels: sortedMonths,
            datasets: [
              {
                label: 'Despesas',
                data: sortedMonths.map(month => monthlyTotals[month].expense),
                backgroundColor: isBarChart ? 'hsl(348, 83%, 61%)' : 'hsla(348, 83%, 61%, 0.2)',
                borderColor: 'hsl(348, 83%, 61%)',
                type: isBarChart ? 'bar' : 'line',
                fill: !isBarChart,
                tension: 0.3,
              },
              {
                label: 'Rendimentos',
                data: sortedMonths.map(month => monthlyTotals[month].income),
                backgroundColor: isBarChart ? 'hsl(141, 71%, 48%)' : 'hsla(141, 71%, 48%, 0.2)',
                borderColor: 'hsl(141, 71%, 48%)',
                type: isBarChart ? 'bar' : 'line',
                fill: !isBarChart,
                tension: 0.3,
              },
              {
                label: 'Saldo Líquido',
                data: sortedMonths.map(month => monthlyTotals[month].income - monthlyTotals[month].expense),
                backgroundColor: 'hsl(217, 71%, 75%)', // Azul claro
                borderColor: 'hsl(217, 71%, 53%)',
                type: isBarChart ? 'bar' : 'line',
                fill: !isBarChart,
                tension: 0.3,
                borderWidth: 2,
              },
            ],
          };
        };

        setChartData(generateChartData(chartType));

      } catch (err) {
        console.error('Error fetching monthly data:', err);
        setError('Failed to load chart data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [chartType]); // Re-executa o efeito quando o chartType muda

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }, // O título já está no card
    },
    scales: {
      x: {
        barPercentage: 0.5, // Reduz a largura da barra para 50% do espaço disponível
        categoryPercentage: 0.7, // Usa 70% do espaço da categoria para as barras, aumentando o espaçamento entre meses
      },
      y: { beginAtZero: true }
    },
  };

  if (loading) return <p>Loading chart...</p>;
  if (error) return <p style={{ color: 'var(--theme-accent-negative)' }}>{error}</p>;
  if (chartData.labels.length === 0) return <p>No monthly data to display yet.</p>;

  return (
    <div className="monthly-chart-container">
      <Bar options={options} data={chartData} />
    </div>
  );
};

export default MonthlyExpenseChart;