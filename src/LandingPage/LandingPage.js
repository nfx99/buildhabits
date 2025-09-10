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
      <div className="animated-bg">
        <div className="floating-circles">
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
          <div className="floating-circle"></div>
        </div>
        <div className="gradient-waves"></div>
        <div className="particle-dots">
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
          <div className="particle-dot"></div>
        </div>
      </div>
      
      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-content">
          <h1>Transform Your Life,</h1>
          <h1>One Habit at a Time</h1>
          <p className="landing-subtitle">
            "We are what we repeatedly do. Excellence, then, is not an act, but a habit." - Will Durant
          </p>
          <div className="cta-container">
            <button className="landing-cta primary" onClick={onGetStarted}>
              Transform Your Life
            </button>
          </div>
          <p className="landing-login-link">
            Already have an account?{' '}
            <a href="/signin" className="login-link">
              Sign In
            </a>
          </p>
        </div>
      </header>

      {/* Demo Section */}
      <section className="demo-section">
        <div className="demo-header">
          <h2>See Your Progress Come to Life</h2>
        </div>
        <HabitCard
          habit={createDemoHabit(demoCompletions)}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onEdit={handleEdit}
          isReadOnly={false}
          isPremium={true}
        />
      </section>

      {/* Problem/Solution Section */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-content">
            <div className="problem-text">
              <h2>Tired of Starting Over?</h2>
              <div className="problem-points">
                <div className="problem-point">
                  <span className="problem-icon">😞</span>
                  <div>
                    <h3>Lost Motivation</h3>
                    <p>You start strong but lose steam after a few days</p>
                  </div>
                </div>
                <div className="problem-point">
                  <span className="problem-icon">📱</span>
                  <div>
                    <h3>Forgotten Habits</h3>
                    <p>Life gets busy and your good intentions slip away</p>
                  </div>
                </div>
                <div className="problem-point">
                  <span className="problem-icon">📊</span>
                  <div>
                    <h3>No Progress Tracking</h3>
                    <p>You can't see how far you've come or what's working</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="solution-text">
              <h2>BuildHabits Makes It Easy</h2>
              <div className="solution-points">
                <div className="solution-point">
                  <span className="solution-icon">🎮</span>
                  <div>
                    <h3>Gamified Progress</h3>
                    <p>Unlock tiers and achievements as you build consistency</p>
                  </div>
                </div>
                <div className="solution-point">
                  <span className="solution-icon">📈</span>
                  <div>
                    <h3>Visual Tracking</h3>
                    <p>See your streak grow with beautiful calendar views</p>
                  </div>
                </div>
                <div className="solution-point">
                  <span className="solution-icon">⚡</span>
                  <div>
                    <h3>Smart Analytics</h3>
                    <p>Track your consistency and identify patterns</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-header">
            <h2>Everything You Need to Succeed</h2>
            <p>Powerful features designed to help you build habits that stick</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Beautiful Calendar View</h3>
              <p>Visualize your progress with an intuitive calendar that makes tracking feel effortless</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔥</div>
              <h3>Streak Tracking</h3>
              <p>Watch your streak counter grow and feel the motivation of maintaining consistency</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Achievement System</h3>
              <p>Unlock tiers from Iron to Legend as you complete more days - gamify your growth</p>
            </div>
            <div className="feature-card premium">
              <div className="feature-icon">♾️</div>
              <h3>Unlimited Habits</h3>
              <p>Track as many habits as you want with Premium (Free users get 2 habits)</p>
              <span className="premium-badge">Premium</span>
            </div>
            <div className="feature-card premium">
              <div className="feature-icon">📦</div>
              <h3>Habit Archive</h3>
              <p>Keep your completed or paused habits organized in a dedicated archive</p>
              <span className="premium-badge">Premium</span>
            </div>
            <div className="feature-card premium">
              <div className="feature-icon">🎨</div>
              <h3>Custom Themes</h3>
              <p>Personalize your experience with custom colors and backgrounds</p>
              <span className="premium-badge">Premium</span>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="container">
          <div className="pricing-header">
            <h2>Choose Your Plan</h2>
            <p>Start free, upgrade when you're ready to unlock your full potential</p>
          </div>
          <div className="pricing-cards">
            <div className="pricing-card free-plan clickable" onClick={onGetStarted}>
              <div className="plan-header">
                <h3>Free</h3>
                <div className="price">
                  <span className="amount">$0</span>
                </div>
              </div>
              <div className="plan-highlight">
                <div className="highlight-title">Perfect for getting started</div>
                <div className="highlight-feature">• Track up to 2 habits</div>
                <div className="highlight-feature">• Basic calendar view</div>
                <div className="highlight-feature">• Simple streak tracking</div>
                <div className="highlight-feature">• Habit analytics</div>
              </div>
            </div>
            
            <div className="pricing-card premium-plan clickable" onClick={onGetStarted}>
              <div className="plan-header">
                <h3>Monthly</h3>
                <div className="price">
                  <span className="amount">$5.00</span>
                </div>
              </div>
              <div className="plan-highlight">
                <div className="highlight-title">Full premium experience</div>
                <div className="highlight-feature">• Unlimited habits</div>
                <div className="highlight-feature">• Habit archive</div>
                <div className="highlight-feature">• Custom themes</div>
                <div className="highlight-feature">• Custom backgrounds</div>
              </div>
            </div>
            
            <div className="pricing-card premium-plan clickable" onClick={onGetStarted}>
              <div className="plan-header">
                <h3>Bi-Annual</h3>
                <div className="price">
                  <span className="amount">$25.00</span>
                </div>
                <div className="savings">Save 17% • $4.17/month</div>
              </div>
              <div className="plan-highlight">
                <div className="highlight-title">Moderate Savings</div>
                <div className="highlight-feature">• All premium features</div>
                <div className="highlight-feature">• Lower monthly cost</div>
                <div className="highlight-feature">• Perfect for habit formation</div>
              </div>
            </div>
            
            <div className="pricing-card premium-plan best-value clickable" onClick={onGetStarted}>
              <div className="value-badge">Best Value</div>
              <div className="plan-header">
                <h3>Annual</h3>
                <div className="price">
                  <span className="amount">$40.00</span>
                </div>
                <div className="savings">Save 33% • $3.33/month</div>
              </div>
              <div className="plan-highlight">
                <div className="highlight-title">Maximum savings</div>
                <div className="highlight-feature">• All premium features</div>
                <div className="highlight-feature">• Lowest cost per month</div>
                <div className="highlight-feature">• Long-term commitment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>How does the free plan work?</h3>
              <p>You can track up to 2 habits completely free, forever. Perfect for getting started and seeing if BuildHabits works for you.</p>
            </div>
            <div className="faq-item">
              <h3>Can I cancel my subscription anytime?</h3>
              <p>Yes! Cancel anytime with just a few clicks. Your subscription will end at your current billing period.</p>
            </div>
            <div className="faq-item">
              <h3>What happens to my habits if I downgrade?</h3>
              <p>Your top 2 habits remain active. Additional habits and their completion data will be permanently deleted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="container">
          <div className="final-cta-content">
            <h2>Ready to Transform Your Life?</h2>
<p>Start building better habits today</p>
            <button className="landing-cta primary large" onClick={onGetStarted}>
              Take Control
            </button>
            <div className="cta-subtext">
              Free to start • Cancel anytime
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 