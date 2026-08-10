import React, { useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  type: 'file' | 'folder';
  item: any;
  onClose: () => void;
  onRename: (item: any) => void;
  onDownload: (item: any) => void;
  onMove: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function ContextMenu({ x, y, type, item, onClose, onRename, onDownload, onMove, onDelete }: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleContextMenu = (e: MouseEvent) => {
      // Allow another context menu to open by not closing here if they right click again,
      // but actually it's easier to just close it and let the new one open in the next cycle.
      onClose();
    };
    
    // Use timeout to prevent immediate close on the same click
    setTimeout(() => {
      window.addEventListener('click', handleClick);
      window.addEventListener('contextmenu', handleContextMenu);
    }, 10);
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        position: 'fixed',
        top: Math.min(y, window.innerHeight - 220), // Prevent overflowing bottom edge
        left: Math.min(x, window.innerWidth - 180), // Prevent overflowing right edge
        width: '160px',
        background: 'rgba(25, 25, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        padding: '6px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}
    >
      <button className="ctx-menu-btn" onClick={() => { onDownload(item); onClose(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download
      </button>
      <button className="ctx-menu-btn" onClick={() => { onRename(item); onClose(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        Rename
      </button>
      <button className="ctx-menu-btn" onClick={() => { onMove(item); onClose(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
        Move
      </button>
      
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
      
      <button className="ctx-menu-btn" style={{ color: '#f58f9b' }} onClick={() => { onDelete(item); onClose(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Delete
      </button>

      <style>{`
        .ctx-menu-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: transparent;
          border: none;
          color: #e0e0e0;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s ease;
        }
        .ctx-menu-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
