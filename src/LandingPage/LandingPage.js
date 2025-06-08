import React, { useState } from 'react';
import './LandingPage.css';
import HabitCard from '../components/HabitCard';
import { startOfYear, format, addDays, startOfDay } from 'date-fns';

const createDemoHabit = (completions) => ({
  id: 'demo',
  name: 'Morning Workout 🏃‍♂️',
  created_at: startOfYear(new Date()).toISOString(),
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
    // For the Log button (today's date), we don't need to adjust
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    // Only adjust the date for non-today dates (clicking on cells)
    const adjustedDate = isToday ? startOfDay(date) : addDays(date, -1);
    const targetDateStr = format(adjustedDate, 'yyyy-MM-dd');
    
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
          date: adjustedDate.toISOString(),
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
    // Since we're not storing the habit name in state, we can just log it
    console.log('Demo edit:', { habitId, newName });
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
          theme="dark"
        />
      </section>
    </div>
  );
};

export default LandingPage; 