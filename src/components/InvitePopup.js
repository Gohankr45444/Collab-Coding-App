/**
 * @fileoverview InvitePopup Component
 * 
 * A reusable popup component that displays collaboration invites in a visually appealing way.
 * Features include:
 * - Clean, modern design with animations
 * - Accept/Decline actions
 * - Close button
 * - Responsive layout
 */

import React from "react";

/**
 * InvitePopup Component
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.invite - The invitation details
 * @param {string} props.invite.title - Title or subject of the invite
 * @param {string} props.invite.note - Additional message or description
 * @param {Function} props.onClose - Handler for closing the popup
 * @param {Function} props.onAccept - Handler for accepting the invitation
 * @param {Function} props.onDecline - Handler for declining the invitation
 * @returns {JSX.Element|null} Renders the invite popup or null if no invite
 * 
 * @example
 * <InvitePopup
 *   invite={{ title: "Join Coding Session", note: "Help needed with React" }}
 *   onClose={() => handleClose()}
 *   onAccept={() => handleAccept()}
 *   onDecline={() => handleDecline()}
 * />
 */
const InvitePopup = ({ invite, onClose, onAccept, onDecline }) => {
  // Return null if no invite to prevent rendering empty popup
  if (!invite) return null;

  return (
    // Main container - Fixed position in top-right corner with animation
    // Uses Tailwind's fixed positioning and custom slideIn animation
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm w-80 border border-gray-200 animate-slideIn z-50">
      {/* Header section - Contains icon, title, and close button */}
      <div className="flex items-center justify-between mb-3">
        {/* Left side - Icon and title */}
        <div className="flex items-center">
          {/* Circular container for the lightning bolt icon */}
          {/* Uses soft blue background for visual emphasis */}
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="img"
              aria-label="Invitation icon"
            >
              {/* Lightning bolt path - Indicates quick action/notification */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          {/* Title - Uses semibold weight for emphasis */}
          <h3 className="ml-2 font-semibold text-gray-800">New Invite</h3>
        </div>
        {/* Close button - Right-aligned with hover effect */}
        {/* Color transitions smoothly on hover for better UX */}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close invitation"
        >
          {/* Close (X) icon */}
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
            aria-label="Close icon"
          >
            {/* X-shape using two crossed lines */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content section - Displays invite details */}
      {/* Uses semantic article role for better accessibility */}
      <div className="mb-4" role="article" aria-label="Invitation details">
        {/* Title - Slightly larger and bolder than note */}
        <p className="text-sm font-medium text-gray-800">{invite.title}</p>
        {/* Note - Smaller and lighter for visual hierarchy */}
        <p className="text-xs text-gray-500 mt-1">{invite.note}</p>
      </div>

      {/* Action buttons - Right-aligned with space between */}
      <div className="flex justify-end gap-2">
        {/* Decline button - Subtle styling to de-emphasize */}
        {/* Uses light background and gray text to indicate secondary action */}
        <button
          onClick={onDecline}
          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Decline invitation"
        >
          Decline
        </button>
        {/* Accept button - Primary action with prominent styling */}
        {/* Uses bright blue background to draw attention */}
        <button
          onClick={onAccept}
          className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          aria-label="Accept invitation"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default InvitePopup;
