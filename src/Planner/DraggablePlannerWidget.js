import React, { useRef, useState } from 'react';
import Planner from './Planner';
import './Planner.css';

const WIDGET_WIDTH = 350;
const WIDGET_HEIGHT = 420;

const DraggablePlannerWidget = ({ session, onRefresh, onHabitClick }) => {
  const widgetRef = useRef(null);
  const [position, setPosition] = useState({
    x: window.innerWidth - WIDGET_WIDTH - 32,
    y: 80
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for refresh events from parent
  React.useEffect(() => {
    if (onRefresh) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [onRefresh]);

  const onMouseDown = (e) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - WIDGET_WIDTH, e.clientX - offset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - offset.y))
      });
    };
    const onMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, offset]);

  return (
    <>
      {!visible && (
        <button
          className="planner-widget-show-btn"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 2001,
            background: '#111',
            color: 'white',
            border: 'none',
            borderRadius: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.01em',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          onClick={() => setVisible(true)}
        >
          📝 Show Planner
        </button>
      )}
      {visible && (
        <div
          ref={widgetRef}
          className="planner-widget"
          style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            width: WIDGET_WIDTH,
            height: WIDGET_HEIGHT,
            zIndex: 2000,
            background: 'var(--bg-primary, #fff)',
            borderRadius: 12,
            border: '1px solid var(--border-primary, #eee)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            userSelect: dragging ? 'none' : 'auto',
            cursor: dragging ? 'grabbing' : 'default',
          }}
        >
          <div
            className="planner-widget-header"
            style={{
              cursor: 'grab',
              background: 'var(--bg-secondary, #f7f7f7)',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              fontSize: '1rem',
              borderBottom: '1px solid var(--border-primary, #eee)',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onMouseDown={onMouseDown}
          >
            <span>📝 Planner</span>
            <button
              className="planner-widget-close"
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '1.2rem',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close planner"
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Planner session={session} onRefresh={refreshTrigger} onHabitClick={onHabitClick} />
          </div>
        </div>
      )}
    </>
  );
};

export default DraggablePlannerWidget; 