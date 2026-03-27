import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PUBLIC_KEY } from '../../config/stripe';

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

interface StripeContainerProps {
  children: React.ReactNode;
}

const StripeContainer: React.FC<StripeContainerProps> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeContainer;
