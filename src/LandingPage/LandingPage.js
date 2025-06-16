import React, { useState } from 'react';
import './LandingPage.css';
import HabitCard from '../components/HabitCard';
import { startOfYear, format, addDays, startOfDay } from 'date-fns';

const createDemoHabit = (completions) => ({
  id: 'demo',
  name: 'Morning Workout 🏃‍♂️',
  created_at: startOfYear(new Date()).toISOString(),
  color: '#3A4F41',
  habit_completions: completions
});

const LandingPage = ({ onGetStarted }) => {
  // Initialize demo habit with some random completions
  const [demoCompletions, setDemoCompletions] = useState(
    Array.from({ length: 365 }, (_, i) => ({
      id: `demo-${i}`,
      date: new Date(Date.now() - (Math.random() > 0.6 ? 0 : i * 24 * 60 * 60 * 1000)).toISOString(),
      created_at: new Date().toISOString()
    })).filter(completion => Math.random() > 0.6)
  );

  const handleComplete = (habitId, date, isUndo = false) => {
    // Use the exact date format that matches the HabitCard logic
    const targetDateStr = format(date, 'yyyy-MM-dd');
    
    if (isUndo) {
      // Remove the completion by filtering out the matching date
      setDemoCompletions(prev => 
        prev.filter(completion => {
          const completionDateStr = format(new Date(completion.date), 'yyyy-MM-dd');
          return completionDateStr !== targetDateStr;
        })
      );
    } else {
      // Check if completion already exists for this date
      const exists = demoCompletions.some(completion => {
        const completionDateStr = format(new Date(completion.date), 'yyyy-MM-dd');
        return completionDateStr === targetDateStr;
      });

      // Only add if it doesn't exist
      if (!exists) {
        const newCompletion = {
          id: `demo-${Date.now()}`,
          date: new Date(targetDateStr + 'T12:00:00.000Z').toISOString(),
          created_at: new Date().toISOString()
        };
        setDemoCompletions(prev => [...prev, newCompletion]);
      }
    }
  };

  const handleDelete = () => {
    // For demo, just clear all completions
    setDemoCompletions([]);
  };

  const handleEdit = (habitId, newName) => {
    // Demo function - no actual editing in landing page
  };

  return (
    <div className="landing-root">
      <div className="animated-bg"></div>
      <header className="landing-hero">
        <div className="landing-hero-content">
          <h1>Build Habits</h1>
          <h1>Build Your Future</h1>
          <p className="landing-subtitle">
            Track your progress and never miss a day again.
          </p>
          <button className="landing-cta" onClick={onGetStarted}>
            Get Started Free
          </button>
        </div>
      </header>

      <section className="demo-section">
        <HabitCard
          habit={createDemoHabit(demoCompletions)}
          onComplete={handleComplete}
                      onDelete={handleDelete}
            onEdit={handleEdit}
        />
      </section>
    </div>
  );
};

export default LandingPage; 