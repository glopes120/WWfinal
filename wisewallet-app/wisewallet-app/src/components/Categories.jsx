import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Categories.css';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, user_id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('category_id');

      if (expensesError) throw expensesError;

      const usedCategoryCounts = {};
      expensesData.forEach(exp => {
        usedCategoryCounts[exp.category_id] = (usedCategoryCounts[exp.category_id] || 0) + 1;
      });

      const categoriesWithDeletableFlag = categoriesData.map(cat => ({
        ...cat,
        usage_count: usedCategoryCounts[cat.id] || 0,
        is_mine: cat.user_id === user.id
      }));

      setCategories(categoriesWithDeletableFlag || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Category name cannot be empty.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert('You must be logged in.');

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim(), user_id: user.id }])
        .select();

      if (error) throw error;

      const newCategory = { ...data[0], usage_count: 0, is_mine: true };
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (category) => {
    // Case 1: System Category
    if (!category.is_mine) {
        if (!window.confirm(`"${category.name}" is a System Category. Deleting it will remove it for ALL users.\n\nAre you sure you want to try?`)) {
            return;
        }

        // Check for usage even in System categories
        if (category.usage_count > 0) {
             const confirmMsg = `System Category "${category.name}" is used by ${category.usage_count} transaction(s).\n\nTo delete it, we must ALSO delete these transactions.\n\nProceed?`;
             if (!window.confirm(confirmMsg)) return;
             
             try {
                // 1. Delete linked expenses
                const { error: expError } = await supabase
                    .from('expenses')
                    .delete()
                    .eq('category_id', category.id);
                
                if (expError) throw expError;
             } catch (error) {
                 console.error('Error cleaning up system category expenses:', error);
                 alert(`Failed to clean up expenses: ${error.message}`);
                 return;
             }
        }

        // Try to delete (will only work if RLS allows or user is admin)
        try {
            const { error } = await supabase.from('categories').delete().eq('id', category.id);
            if (error) throw error;
            setCategories(categories.filter(cat => cat.id !== category.id));
            return;
        } catch (error) {
             console.error('System delete failed:', error);
             
             // FALLBACK: Try the Super Delete RPC function if it exists
             if (error.code === '23503' || error.code === '409') {
                 try {
                     console.log('Attempting RPC Super Delete for ID:', category.id);
                     const { error: rpcError } = await supabase.rpc('delete_category_forcefully', { target_category_id: category.id });
                     
                     if (rpcError) {
                         console.error('RPC Force delete returned error:', rpcError);
                         throw rpcError;
                     }
                     
                     console.log('RPC Super Delete SUCCESS');
                     alert(`Successfully force-deleted "${category.name}" and all its linked data.`);
                     setCategories(categories.filter(cat => cat.id !== category.id));
                     return;
                 } catch (rpcErr) {
                     console.error('RPC Force delete caught exception:', rpcErr);
                 }
             }

             alert(`Could not delete System Category: ${error.message}\n(Likely protected by database policy and RPC failed)`);
             return;
        }
    }

    // Case 2: In Use (User Category)
    if (category.usage_count > 0) {
        const confirmMsg = `"${category.name}" is used by ${category.usage_count} transaction(s).\n\nDo you want to DELETE the category AND ALL these transactions?\n(This cannot be undone)`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            // 1. Delete linked expenses
            const { error: expError } = await supabase
                .from('expenses')
                .delete()
                .eq('category_id', category.id);
            
            if (expError) throw expError;

            // 2. Delete the category
            const { error: catError } = await supabase
                .from('categories')
                .delete()
                .eq('id', category.id);

            if (catError) throw catError;

            setCategories(categories.filter(cat => cat.id !== category.id));
            alert(`Deleted "${category.name}" and ${category.usage_count} transactions.`);
        } catch (error) {
            console.error('Error force deleting:', error);
            alert(`Failed: ${error.message}`);
        }
        return;
    }

    // Case 3: Empty User Category
    if (window.confirm(`Delete "${category.name}"?`)) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (error) throw error;

        setCategories(categories.filter(cat => cat.id !== category.id));
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="categories-container">
      <h3>Manage Categories</h3>
      
      <form onSubmit={handleAddCategory} className="add-category-form">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          required
        />
        <button type="submit">Add</button>
      </form>

      {loading ? (
        <p>Loading categories...</p>
      ) : (
        <ul className="categories-list">
          {categories.map(cat => (
            <li key={cat.id} className="category-item">
              <div style={{display:'flex', flexDirection:'column'}}>
                  <span>{cat.name}</span>
                  {!cat.is_mine && <span style={{fontSize:'0.7rem', color:'var(--theme-text-tertiary)'}}>Global</span>}
              </div>
              <button 
                onClick={() => handleDeleteCategory(cat)} 
                className="delete-btn"
                // Always enabled now to allow "Force Delete"
                title={!cat.is_mine ? "System Category" : `Used by ${cat.usage_count} tx`}
              >
                {/* Visual cue only */}
                {!cat.is_mine ? 'Delete (Sys)' : (cat.usage_count > 0 ? `Delete (${cat.usage_count})` : 'Delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Categories;