import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, SubscriptionPlanInfo, CurrentSubscription } from '../api/subscription';
import { SubscriptionPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './Subscription.css';

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlanInfo[]>({
    queryKey: ['subscriptionPlans'],
    queryFn: subscriptionApi.getPlans,
  });

  const { data: currentSubscription } = useQuery<CurrentSubscription>({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getCurrent,
    enabled: !!user,
  });

  const handleSubscribe = async (_plan: SubscriptionPlan) => {
    // TODO: 集成 Stripe Checkout
    // const session = await subscriptionApi.createCheckoutSession(plan, selectedPeriod);
    // window.location.href = session.url;
    alert('Stripe integration coming soon!');
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatLimit = (limit: number | typeof Infinity) => {
    return limit === Infinity ? 'Unlimited' : limit.toString();
  };

  if (plansLoading) {
    return (
      <div className="subscription-container">
        <div className="subscription-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
        <h1>Subscription Plans</h1>
        <p className="subscription-subtitle">Choose the plan that best fits your needs</p>
      </div>

      {currentSubscription && (
        <div className="current-subscription">
          <div className="current-subscription-content">
            <div>
              <span className="current-label">Current Plan:</span>
              <span className="current-plan">{currentSubscription.plan}</span>
            </div>
            {currentSubscription.endDate && (
              <div className="current-date">
                {currentSubscription.plan !== SubscriptionPlan.FREE && (
                  <span>Renews on {new Date(currentSubscription.endDate).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="period-selector">
        <button
          className={`period-button ${selectedPeriod === 'monthly' ? 'active' : ''}`}
          onClick={() => setSelectedPeriod('monthly')}
        >
          Monthly
        </button>
        <button
          className={`period-button ${selectedPeriod === 'yearly' ? 'active' : ''}`}
          onClick={() => setSelectedPeriod('yearly')}
        >
          Yearly
          {currentSubscription?.isFirstTimeSubscriber && (
            <span className="discount-badge">Save up to 62%</span>
          )}
        </button>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan === plan.plan;
          const isFree = plan.plan === SubscriptionPlan.FREE;
          const price = selectedPeriod === 'yearly' 
            ? (currentSubscription?.isFirstTimeSubscriber && plan.yearlyFirstTimePrice 
                ? plan.yearlyFirstTimePrice 
                : plan.yearlyPrice)
            : plan.monthlyPrice;

          return (
            <div
              key={plan.plan}
              className={`plan-card ${isCurrentPlan ? 'current' : ''} ${isFree ? 'free-plan' : ''}`}
            >
              {isCurrentPlan && <div className="current-badge">Current Plan</div>}
              <div className="plan-header">
                <h2 className="plan-name">{plan.name}</h2>
                {!isFree && price && (
                  <div className="plan-price">
                    <span className="price-amount">{formatPrice(price)}</span>
                    <span className="price-period">/{selectedPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                )}
                {isFree && <div className="plan-price free">Free</div>}
              </div>

              <div className="plan-features">
                <div className="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    <strong>{formatLimit(plan.limits.maxProjects)}</strong> Projects
                  </span>
                </div>
                <div className="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    <strong>{formatLimit(plan.limits.maxMembersPerProject)}</strong> Members per Project
                  </span>
                </div>
              </div>

              {!isFree && (
                <button
                  className={`subscribe-button ${isCurrentPlan ? 'current-button' : ''}`}
                  onClick={() => handleSubscribe(plan.plan)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="subscription-footer">
        <p>All plans include full access to all features. Cancel anytime.</p>
      </div>
    </div>
  );
};

