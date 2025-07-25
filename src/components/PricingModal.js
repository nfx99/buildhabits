import React, { useState } from 'react';
import './PricingModal.css';

const PricingModal = ({ isOpen, onClose, onSelectPlan, isLoading }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly',
      price: '$5.00',
      period: '/month',
      // TODO: Replace with actual price ID from Stripe dashboard for monthly plan
      // This should correspond to: https://buy.stripe.com/7sYcN52ul79sbiDgiD0Ny02
      priceId: 'price_monthly_buildhabits_2024', 
      description: 'Perfect for getting started',
      popular: false
    },
    sixMonth: {
      id: 'sixMonth', 
      name: '6 Months',
      price: '$25.00',
      period: '/6 months',
      // TODO: Replace with actual price ID from Stripe dashboard for 6-month plan
      // This should correspond to: https://buy.stripe.com/fZu5kDc4V3XgeuPfez0Ny03
      priceId: 'price_6month_buildhabits_2024',
      description: 'Great value for committed users',
      popular: false,
      savings: 'Save 17%' // $25 vs $30 (6 x $5)
    },
    yearly: {
      id: 'yearly',
      name: 'Annual',
      price: '$40.00', 
      period: '/year',
      // TODO: Replace with actual price ID from Stripe dashboard for yearly plan
      // This should correspond to: https://buy.stripe.com/bJe3cv8SJalEbiD8Qb0Ny04
      priceId: 'price_yearly_buildhabits_2024',
      description: 'Maximum savings for power users',
      popular: true,
      savings: 'Save 33%' // $40 vs $60 (12 x $5)
    }
  };

  const handleSelectPlan = () => {
    const plan = plans[selectedPlan];
    onSelectPlan(plan.priceId, plan.id);
  };

  if (!isOpen) return null;

  return (
    <div className="pricing-modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pricing-modal-close" onClick={onClose}>
          ×
        </button>
        
        <div className="pricing-modal-header">
          <h2>Choose Your Plan</h2>
          <p>Unlock unlimited habits and premium features</p>
        </div>

        <div className="pricing-plans">
          {Object.values(plans).map((plan) => (
            <div 
              key={plan.id}
              className={`pricing-plan ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="popular-badge">Best Choice</div>
              )}
              
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
                {plan.savings && (
                  <div className="savings-badge">{plan.savings}</div>
                )}
              </div>
              
              <p className="plan-description">{plan.description}</p>
            </div>
          ))}
        </div>

        <button 
          className="pricing-modal-button"
          onClick={handleSelectPlan}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : `Continue with ${plans[selectedPlan].name}`}
        </button>
      </div>
    </div>
  );
};

export default PricingModal; 