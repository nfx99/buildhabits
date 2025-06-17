import React, { useState } from 'react';
import './LandingPage.css';
import HabitCard from '../components/HabitCard';
import { startOfYear, format, addDays, startOfDay } from 'date-fns';

const createDemoHabit = (completions) => ({
  id: 'demo',
  name: 'Morning Workout 🏃‍♂️',
  created_at: startOfYear(new Date(2025, 0, 1)).toISOString(),
  color: '#000000',
  habit_completions: completions
});

const LandingPage = ({ onGetStarted }) => {
  // Initialize demo habit with completions for the entire year 2025
  const [demoCompletions, setDemoCompletions] = useState(() => {
    const completions = [];
    const startDate = new Date(2025, 0, 1); // January 1, 2025
    
    // Generate completions for all 365 days of 2025
    for (let i = 0; i < 365; i++) {
      const currentDate = addDays(startDate, i);
      
      // Randomly decide if this day should have a completion (about 60% chance)
      if (Math.random() > 0.4) {
        completions.push({
          id: `demo-${i}`,
          date: currentDate.toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }
    
    return completions;
  });

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
          <p className="landing-login-link">
            Already have an account?{' '}
            <a href="/signin" className="login-link">
              Sign In
            </a>
          </p>
        </div>
      </header>

      <section className="demo-section">
        <HabitCard
          habit={createDemoHabit(demoCompletions)}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onEdit={handleEdit}
          isReadOnly={true}
        />
      </section>
    </div>
  );
};

export default LandingPage; 