export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] } 
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      transition: { duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] } 
    }
  };
  
  export const staggerChildren = {
    animate: {
      transition: { staggerChildren: 0.2, delayChildren: 0.3 } 
    }
  };
  
  export const searchBarVariants = {
    focused: { 
      scale: 1.02, 
      transition: { duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] } 
    },
    unfocused: { 
      scale: 1, 
      transition: { duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] } 
    }
  };
  
  export const logoVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] } 
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      transition: { duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] } 
    }
  };
  