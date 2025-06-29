import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import './Planner.css';

const Planner = ({ session, onRefresh, onHabitClick }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('habit_plans')
        .select(`
          id,
          planned_date,
          habit:habits (
            id,
            name,
            color
          )
        `)
        .eq('user_id', session.user.id)
        .gte('planned_date', new Date().toISOString().split('T')[0])
        .order('planned_date', { ascending: true });

      if (error) {
        console.error("Error fetching habit plans (the table might not exist yet). Please run the SQL script provided.", error);
        setPlans([]);
      } else {
        setPlans(data || []);
      }
    } catch (error) {
        console.error("Error fetching habit plans:", error);
        setPlans([]);
    } finally {
        setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Listen for refresh events from parent
  useEffect(() => {
    if (onRefresh) {
      fetchPlans();
    }
  }, [onRefresh, fetchPlans]);

  const handleDeletePlan = async (planId) => {
    try {
      const { error } = await supabase
        .from('habit_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting plan:', error);
      } else {
        // Remove from local state
        setPlans(prev => prev.filter(plan => plan.id !== planId));
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleHabitClick = (habitId) => {
    if (onHabitClick) {
      onHabitClick(habitId);
    }
  };

  if (loading) {
    return <div className="loading">Loading Planner...</div>;
  }

  return (
    <div className="planner-container">
      {plans.length > 0 ? (
        <div className="plans-list">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className="plan-item clickable-plan" 
              style={{'--habit-color': plan.habit.color || '#000000'}}
              onClick={() => handleHabitClick(plan.habit.id)}
              title="Click to view habit"
            >
              <div className="plan-info">
                <span className="plan-habit-name">
                  {plan.habit.name}
                </span>
                <span className="plan-date-small">{new Date(plan.planned_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="plan-actions">
                <button 
                  className="delete-plan-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlan(plan.id);
                  }}
                  title="Delete plan"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-plans">
          <p>You have no upcoming habits planned.</p>
          <p>Click a future date on a habit's calendar to add it to your planner.</p>
        </div>
      )}
    </div>
  );
};

export default Planner; 