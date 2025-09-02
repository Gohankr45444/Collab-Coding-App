import React from 'react';

/**
 * AnimatedBackground Component
 * Creates a dynamic, interactive background with floating elements
 * representing coding symbols and collaboration
 */
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating Code Symbols */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${10 + Math.random() * 10}s linear infinite`,
              animationDelay: `${-Math.random() * 10}s`,
              opacity: 0.1
            }}
          >
            {['{ }', '< /', '/>', '( )', '[ ]'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${200 + Math.random() * 300}px`,
              height: `${200 + Math.random() * 300}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0) 70%)`,
              animation: `pulse ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${-Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(79, 70, 229, 0.1)" />
            <stop offset="50%" stopColor="rgba(79, 70, 229, 0.2)" />
            <stop offset="100%" stopColor="rgba(79, 70, 229, 0.1)" />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => {
          const x1 = Math.random() * 100;
          const y1 = Math.random() * 100;
          const x2 = Math.random() * 100;
          const y2 = Math.random() * 100;
          return (
            <line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              strokeDasharray="5,5"
              className="animate-dash"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default AnimatedBackground;
