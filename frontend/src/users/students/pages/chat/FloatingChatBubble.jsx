import React, { useRef, useState } from 'react';

export default function FloatingChatBubble({ onClick, unreadCount = 0, style = {}, friend, onCloseBubble }) {
  // Get user from localStorage or use friend
  let user = friend || JSON.parse(localStorage.getItem('user')) || {};
  // Compute initials
  const getInitials = (user) => {
    if (!user) return '';
    const names = [user.firstName, user.lastName].filter(Boolean);
    if (names.length) return names.map(n => n[0]).join('').toUpperCase();
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    return '';
  };
  const initials = getInitials(user);
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        right: 32,
        bottom: 32,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#82DFFF',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 2000,
        userSelect: 'none',
        fontWeight: 700,
        fontSize: 22,
        color: '#0D131A',
        letterSpacing: 1,
        ...style,
      }}
      title={user.firstName || user.username || 'Open Chat'}
    >
      {initials}
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: 2,
          right: 2,
          background: '#ef4444',
          color: '#fff',
          borderRadius: '9999px',
          fontSize: 11,
          fontWeight: 700,
          padding: '0 5px',
          minWidth: 16,
          height: 16,
          lineHeight: '16px',
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
        }}>{unreadCount}</span>
      )}
      {onCloseBubble && (
        <button
          onClick={e => { e.stopPropagation(); onCloseBubble(); }}
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            background: 'none',
            border: 'none',
            color: '#0D131A',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
          title="Close Chat"
        >×</button>
      )}
    </div>
  );
} 