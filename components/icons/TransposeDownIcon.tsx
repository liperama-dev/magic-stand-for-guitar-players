import React from 'react';

const TransposeDownIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13v-2a2 2 0 012-2h2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13a2 2 0 002 2h2a2 2 0 002-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h0" />
        <text x="16" y="19" fontSize="14" fill="currentColor" fontWeight="bold">♭</text>
    </svg>
);

export default TransposeDownIcon;
