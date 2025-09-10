import React, { useState } from 'react';
import './PricingModal.css';

const PricingModal = ({ isOpen, onClose, onSelectPlan, isLoading }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly',
      price: '$5.00',
      priceId: 'price_1RosKmEVtge1S4ocLAKvbWZH', 
      highlightTitle: 'Full premium experience',
      features: ['• Unlimited habits', '• Habit archive', '• Custom themes', '• Custom backgrounds']
    },
    sixMonth: {
      id: 'sixMonth', 
      name: 'Bi-Annual',
      price: '$25.00',
      priceId: 'price_1RosOEEVtge1S4oc5zVB2el7',
      savings: 'Save 17% • $4.17/month',
      highlightTitle: 'Moderate Savings',
      features: ['• All premium features', '• Lower monthly cost', '• Perfect for habit formation']
    },
    yearly: {
      id: 'yearly',
      name: 'Annual',
      price: '$40.00',
      priceId: 'price_1RosQ6EVtge1S4ocPMeL7HDW',
      savings: 'Save 33% • $3.33/month',
      highlightTitle: 'Maximum savings',
      features: ['• All premium features', '• Lowest cost per month', '• Long-term commitment'],
      bestValue: true
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
              className={`pricing-plan ${selectedPlan === plan.id ? 'selected' : ''} ${plan.bestValue ? 'best-value' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.bestValue && (
                <div className="value-badge">Best Value</div>
              )}
              
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                </div>
                {plan.savings && (
                  <div className="savings-badge">{plan.savings}</div>
                )}
              </div>
              
              <div className="plan-highlight">
                <div className="highlight-title">{plan.highlightTitle}</div>
                {plan.features.map((feature, index) => (
                  <div key={index} className="highlight-feature">{feature}</div>
                ))}
              </div>
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