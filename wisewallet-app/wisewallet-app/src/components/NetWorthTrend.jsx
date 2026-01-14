import React, { useRef, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import './NetWorthTrend.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const NetWorthTrend = () => {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  const trendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    values: [45000, 45500, 46000, 46800, 47500, 48200, 49000, 50000, 51500, 53500, 55800, 56000],
  };

  useEffect(() => {
    const chart = chartRef.current;

    if (chart) {
      const ctx = chart.ctx;
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

      setChartData({
        labels: trendData.labels,
        datasets: [
          {
            label: 'Net Worth',
            data: trendData.values,
            fill: true,
            backgroundColor: gradient,
            borderColor: '#8b5cf6',
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#8b5cf6',
            tension: 0.4,
          },
        ],
      });
    }
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          callback: function (value, index, values) {
            return '$' + value / 1000 + 'k';
          },
        },
      },
    },
  };

  return (
    <div className="net-worth-trend-container">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default NetWorthTrend;
