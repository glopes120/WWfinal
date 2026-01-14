import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/revolut-base.css';
import './FinancialGoals.css';

const COLORS = ['bg-emerald', 'bg-blue', 'bg-purple', 'bg-red', 'bg-orange'];
const FILLS = ['fill-emerald', 'fill-blue', 'fill-purple', 'fill-red', 'fill-orange'];
const ICONS = ['🛡️', '🏠', '🏖️', '💳', '🚗', '🎓'];

export default function FinancialGoals({ setView }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', target: '', current: '', date: '' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) loadGoals(user.id);
    };
    fetchData();
  }, []);

  const loadGoals = async (userId) => {
    const { data } = await supabase.from('financial_goals').select('*').eq('user_id', userId).order('deadline', { ascending: true });
    if (data) {
      setGoals(data.map((g, i) => {
        const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const progress = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
        const colorIndex = i % COLORS.length;
        return {
          id: g.id,
          name: g.name,
          current: g.current_amount,
          target: g.target_amount,
          daysLeft: days > 0 ? days : 0,
          progress,
          deadline: new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          icon: ICONS[colorIndex],
          colorClass: COLORS[colorIndex],
          fillClass: FILLS[colorIndex]
        };
      }));
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.target || !formData.date) return;
    await supabase.from('financial_goals').insert([{
      user_id: user.id, name: formData.name, target_amount: formData.target, current_amount: formData.current || 0, deadline: formData.date
    }]);
    setShowAddModal(false);
    setFormData({ name: '', target: '', current: '', date: '' });
    loadGoals(user.id);
  };

  const renderStrategies = () => {
    if (goals.length === 0) return <div className="revolut-empty-state">Add goals to see strategies.</div>;
    const urgent = goals.find(g => g.daysLeft < 60 && g.progress < 50);
    const near = goals.find(g => g.progress > 80 && g.progress < 100);
    
    return (
      <div>
        {near && (
          <div className="revolut-card-sm" style={{ background: 'rgba(0, 216, 86, 0.1)', border: '1px solid rgba(0, 216, 86, 0.3)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{fontSize:'1.5rem'}}>🚀</span>
              <h3 className="revolut-item-title" style={{ color: '#00D856' }}>Momentum Boost</h3>
            </div>
            <p className="revolut-item-subtitle" style={{ marginBottom: '0.75rem' }}>You are {near.progress}% done with <strong>{near.name}</strong>. A final push of €{(near.target - near.current).toLocaleString()} finishes it!</p>
            <button className="revolut-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>Boost Now →</button>
          </div>
        )}
        {urgent ? (
          <div className="revolut-card-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{fontSize:'1.5rem'}}>⚠️</span>
              <h3 className="revolut-item-title" style={{ color: '#ef4444' }}>Urgency Alert</h3>
            </div>
            <p className="revolut-item-subtitle" style={{ marginBottom: '0.75rem' }}><strong>{urgent.name}</strong> is due in {urgent.daysLeft} days. You need ~€{((urgent.target - urgent.current)/urgent.daysLeft).toFixed(0)}/day to hit it.</p>
            <button className="revolut-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>Adjust Plan →</button>
          </div>
        ) : !near && (
          <div className="revolut-card-sm" style={{ background: 'rgba(0, 117, 255, 0.1)', border: '1px solid rgba(0, 117, 255, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span>📈</span>
              <h3 className="revolut-item-title" style={{ color: '#0075FF' }}>Steady Growth</h3>
            </div>
            <p className="revolut-item-subtitle">Great job tracking your goals. Consider setting up auto-transfers to maintain consistency.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="revolut-container">
      {/* Header */}
      <div className="revolut-header">
        <button 
          onClick={() => setView ? setView('Dashboard') : window.history.back()}
          className="revolut-back-btn"
        >
          ←
        </button>
        <div>
          <h1 className="revolut-title">Financial Goals</h1>
          <p className="revolut-subtitle">Track your progress and achieve your dreams</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="revolut-btn">+ Add Goal</button>
      </div>

      {loading ? <div className="revolut-empty-state">Loading...</div> : (
        <>
          {/* Goal Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {goals.map(goal => (
              <div key={goal.id} className="revolut-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="revolut-icon-circle" style={{ background: `rgba(${goal.colorClass.includes('emerald') ? '0, 216, 86' : goal.colorClass.includes('blue') ? '0, 117, 255' : goal.colorClass.includes('purple') ? '147, 51, 234' : '239, 68, 68'}, 0.2)` }}>
                    {goal.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="revolut-item-title">{goal.name}</div>
                    <div className="revolut-item-subtitle">⏱️ {goal.daysLeft} days left</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                  <span>€{goal.current.toLocaleString()} of €{goal.target.toLocaleString()}</span>
                  <span className={goal.progress >= 80 ? 'revolut-change-positive' : goal.progress >= 50 ? 'revolut-change-positive' : ''}>{goal.progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${goal.progress}%`, 
                    background: goal.progress >= 80 ? '#00D856' : goal.progress >= 50 ? '#0075FF' : '#f59e0b',
                    borderRadius: '9999px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            ))}
            {goals.length === 0 && <div className="revolut-empty-state" style={{ gridColumn: '1 / -1' }}>No active goals found. Create your first goal!</div>}
          </div>

          {/* Progress Detail */}
          <div className="revolut-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Goal Progress</h2>
            <div>
              {goals.map(goal => (
                <div key={goal.id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: goals.indexOf(goal) < goals.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: goal.progress >= 80 ? '#00D856' : goal.progress >= 50 ? '#0075FF' : '#f59e0b' }}></div>
                      <span className="revolut-item-title">{goal.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={goal.progress >= 80 ? 'revolut-change-positive' : ''} style={{ fontWeight: 600, marginRight: '0.5rem' }}>{goal.progress}%</span>
                      <span className="revolut-item-subtitle">{goal.daysLeft} days left</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="revolut-item-subtitle" style={{ fontSize: '0.75rem' }}>€{goal.current.toLocaleString()} of €{goal.target.toLocaleString()}</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${goal.progress}%`, 
                        background: goal.progress >= 80 ? '#00D856' : goal.progress >= 50 ? '#0075FF' : '#f59e0b',
                        borderRadius: '9999px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="revolut-card">
              <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Goal Strategies</h2>
              {renderStrategies()}
            </div>

            <div className="revolut-card">
              <h2 className="revolut-label" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Goal Timeline</h2>
              <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                <div style={{ position: 'absolute', left: '0.375rem', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.1)' }}></div>
                {goals.slice(0,4).map((item, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '-0.25rem', 
                      top: '0.25rem',
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: item.progress >= 100 ? '#00D856' : item.progress > 0 ? '#0075FF' : 'rgba(255,255,255,0.2)',
                      border: '2px solid #1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.625rem'
                    }}>{item.progress >= 100 && '✓'}</div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className="revolut-item-title">{item.name}</span>
                        <span className="revolut-item-subtitle">{item.deadline}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="revolut-item-subtitle">{item.daysLeft} days left</span>
                        <span className={item.progress >= 50 ? 'revolut-change-positive' : ''}>{item.progress}% complete</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="revolut-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="revolut-modal-content" onClick={e => e.stopPropagation()}>
            <div className="revolut-modal-handle"></div>
            <h2 className="revolut-modal-title">Add New Goal</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="revolut-label">Goal Name</label>
                <input className="revolut-form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Vacation" />
              </div>
              <div>
                <label className="revolut-label">Target Amount (€)</label>
                <input type="number" className="revolut-form-input" value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} placeholder="5000" />
              </div>
              <div>
                <label className="revolut-label">Current Saved (€)</label>
                <input type="number" className="revolut-form-input" value={formData.current} onChange={e => setFormData({...formData, current: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="revolut-label">Target Date</label>
                <input type="date" className="revolut-form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowAddModal(false)} className="revolut-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleAdd} className="revolut-btn" style={{ flex: 1 }}>Create Goal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}