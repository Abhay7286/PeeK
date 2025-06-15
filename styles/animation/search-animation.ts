
export const searchAnimations = {
  logo: {
    initial: { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.4, ease: "easeIn" }
    }
  },

  searchBar: {
    focused: {
      scale: 1.02,
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
      transition: { duration: 0.3, ease: "easeOut" }
    },
    unfocused: {
      scale: 1,
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.25)",
      transition: { duration: 0.3, ease: "easeOut" }
    }
  },

  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      y: 20,
      transition: { duration: 0.4, ease: "easeIn" }
    }
  },

  stagger: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  }
};

// Additional helper animation presets that can be used across components
export const buttonAnimations = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

export const cardAnimations = {
  hover: {
    y: -4,
    transition: { duration: 0.2 }
  }
};

export const loadingSpinner = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
};