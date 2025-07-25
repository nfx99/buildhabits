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
      priceId: 'price_1RosKmEVtge1S4ocLAKvbWZH', 
      description: 'Perfect for getting started',
      popular: false
    },
    sixMonth: {
      id: 'sixMonth', 
      name: '6 Months',
      price: '$25.00',
      period: '/6 months',
      priceId: 'price_1RosOEEVtge1S4oc5zVB2el7',
      description: 'Great value for committed users',
      popular: false,
      savings: 'Save 17%' // $25 vs $30 (6 x $5)
    },
    yearly: {
      id: 'yearly',
      name: 'Annual',
      price: '$40.00', 
      period: '/year',
      priceId: 'price_1RosQ6EVtge1S4ocPMeL7HDW',
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