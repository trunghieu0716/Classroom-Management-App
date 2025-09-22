import React, { useState, useEffect } from 'react';

/**
 * StudentLoginController - A helper component to control the view state for student login
 * This abstracts the view state management logic away from the UI component
 */
const StudentLoginController = ({ children, initialStep = 'email' }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Log state changes for debugging
  useEffect(() => {
    console.log('🔄 LoginController: Step changed to', currentStep);
  }, [currentStep]);
  
  // Transition to a new step with controlled timing
  const transitionTo = (newStep) => {
    console.log(`🔄 LoginController: Transitioning from ${currentStep} to ${newStep}`);
    setIsTransitioning(true);
    
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      setCurrentStep(newStep);
      setIsTransitioning(false);
    });
  };
  
  // Create child props with controller functions
  const controllerProps = {
    currentStep,
    transitionTo,
    isTransitioning
  };
  
  // Call children as a function with controller props
  return typeof children === 'function' ? children(controllerProps) : null;
};

export default StudentLoginController;