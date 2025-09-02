import React from 'react';

/**
 * Animated Logo Component
 * Creates an engaging animated logo for SkillConnect
 * featuring interconnected nodes representing collaboration
 */
const AnimatedLogo = () => {
  return (
    <div className="relative w-full min-h-[200px]">
      <div className="absolute inset-0 flex flex-col items-center justify-left pt-8">
        <div className="relative z-50 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 animate-pulse">
            SkillConnect
          </h1>
          <p className="text-sm text-gray-600 mt-1 animate-fade-in">Learn Together, Solve Together</p>
        </div>
      </div>
      <div className="animated-logo-container absolute inset-0 pointer-events-none">
        <svg
          className="absolute w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Animated Connection Lines */}
          <line
            className="connection-line"
            x1="20"
            y1="20"
            x2="80"
            y2="80"
            stroke="#4F46E5"
            strokeWidth="0.5"
            strokeDasharray="5,5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="20"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
          <line
            className="connection-line"
            x1="80"
            y1="20"
            x2="20"
            y2="80"
            stroke="#4F46E5"
            strokeWidth="0.5"
            strokeDasharray="5,5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-20"
              dur="2s"
              repeatCount="indefinite"
            />
          </line>

          {/* Animated Nodes */}
          <circle
            className="node animate-pulse"
            cx="20"
            cy="20"
            r="3"
            fill="#4F46E5"
          >
            <animate
              attributeName="r"
              values="2;3;2"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            className="node animate-pulse"
            cx="80"
            cy="20"
            r="3"
            fill="#4F46E5"
          >
            <animate
              attributeName="r"
              values="3;2;3"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            className="node animate-pulse"
            cx="20"
            cy="80"
            r="3"
            fill="#4F46E5"
          >
            <animate
              attributeName="r"
              values="2;3;2"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            className="node animate-pulse"
            cx="80"
            cy="80"
            r="3"
            fill="#4F46E5"
          >
            <animate
              attributeName="r"
              values="3;2;3"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
    </div>
  );
};

export default AnimatedLogo;
