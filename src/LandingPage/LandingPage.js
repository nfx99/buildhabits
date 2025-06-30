import React, { useState } from 'react';
import './LandingPage.css';
import HabitCard from '../components/HabitCard';
import { startOfYear, format, addDays, startOfDay, isAfter } from 'date-fns';

const createDemoHabit = (completions) => ({
  id: 'demo',
  name: 'Morning Workout 🏃‍♂️',
  created_at: startOfYear(new Date()).toISOString(), // Use current year instead of hardcoded 2025
  color: '#000000',
  has_insights: true,
  insight_settings: {
    showCurrentStreak: true,
    showTotalDays: true
  },
  habit_completions: completions
});

const LandingPage = ({ onGetStarted }) => {
  // Initialize demo habit with strategic completions to showcase tier system
  const [demoCompletions, setDemoCompletions] = useState(() => {
    const completions = [];
    const today = new Date();
    const habitCreationDate = startOfYear(new Date()); // January 1st of current year
    
    // Calculate the maximum days we can go back (from today to habit creation)
    const maxDaysBack = Math.floor((today - habitCreationDate) / (1000 * 60 * 60 * 24));
    
    // For each day since habit creation, randomly decide if there's a completion
    for (let i = 0; i <= maxDaysBack; i++) {
      const shouldHaveCompletion = Math.random() < 0.5; // 50% chance for each day
      
      if (shouldHaveCompletion) {
        const date = addDays(today, -i);
        completions.push({
          id: `demo-${i}`,
          date: date.toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }
    
    return completions;
  });

  const handleComplete = (habitId, date, isUndo = false) => {
    // Prevent logging for future dates
    const today = startOfDay(new Date());
    const selectedDay = startOfDay(date);
    
    if (isAfter(selectedDay, today)) {
      // Don't process future dates
      return;
    }
    
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
          isPremium={true}
        />
      </section>
    </div>
  );
};

export default LandingPage; 