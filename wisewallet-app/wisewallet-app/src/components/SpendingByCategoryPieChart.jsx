import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { supabase } from '../supabaseClient';
import './SpendingByCategoryPieChart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const SpendingByCategoryPieChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpendingData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Get categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');
        if (categoriesError) throw categoriesError;

        const categoryMap = new Map(categoriesData.map(cat => [cat.id, cat.name]));
        const incomeCategory = categoriesData.find(cat => cat.name.trim().toLowerCase() === 'income');
        const incomeCategoryId = incomeCategory ? incomeCategory.id : null;

        // 2. Get expenses for the current month
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, category_id')
          .eq('user_id', user.id)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);

        if (expensesError) throw expensesError;

        // 3. Process data
        const spendingByCategory = expensesData
          .filter(exp => exp.category_id !== incomeCategoryId) // Exclude income
          .reduce((acc, expense) => {
            const categoryName = categoryMap.get(expense.category_id) || 'Uncategorized';
            acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
            return acc;
          }, {});

        const labels = Object.keys(spendingByCategory);
        const data = Object.values(spendingByCategory);

        if (labels.length > 0) {
          setChartData({
            labels,
            datasets: [
              {
                label: 'Spending',
                data,
                backgroundColor: [
                  '#6c5ce7', '#a29bfe', '#fd79a8', '#fab1a0',
                  '#00b894', '#55efc4', '#ffeaa7', '#fdcb6e',
                  '#0984e3', '#74b9ff', '#e17055', '#d63031',
                ],
                borderColor: 'var(--ww-bg-surface)',
                borderWidth: 2,
              },
            ],
          });
        } else {
          setChartData(null);
        }

      } catch (err) {
        console.error('Error fetching spending data for pie chart:', err);
        setError('Failed to load spending data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpendingData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'var(--ww-text-secondary)',
          boxWidth: 20,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Spending by Category (Current Month)',
        color: 'var(--ww-text-primary)',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    cutout: '60%',
  };

  if (loading) return <p>Loading spending chart...</p>;
  if (error) return <p style={{ color: 'var(--theme-accent-negative)' }}>{error}</p>;
  if (!chartData) return <p>No spending data for this month yet.</p>;

  return (
    <div className="spending-by-category-pie-chart-container">
      <Doughnut options={options} data={chartData} />
    </div>
  );
};

export default SpendingByCategoryPieChart;
