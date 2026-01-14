import React from 'react';

// Este é um componente de teste que NÃO PODE FALHAR.
function Dashboard() {

  const styles = {
    padding: '20px',
    backgroundColor: '#f0e68c', // Um fundo cor de areia
    border: '3px solid red',      // Uma borda vermelha
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 'bold'
  };

  return (
    <div style={styles}>
      <p>TESTE DASHBOARD: OK!</p>
      <p>Se está a ver isto, o seu App.jsx está correto.</p>
      <p>O problema estava no código anterior do Dashboard (provavelmente os gráficos).</p>
    </div>
  );
}

export default Dashboard;