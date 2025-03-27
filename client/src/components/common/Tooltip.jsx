import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import './Tooltip.css';

const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 0,
  animation = 'fade',
  trigger = 'hover',
  maxWidth = 250,
  className = '',
  closeOnClickOutside = true,
  isOpen: controlledIsOpen,
  onClose,
  portalContainer,
  arrow = true,
  offset = 8,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Use controlled state if provided, otherwise use internal state
  const tooltipVisible = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;
  
  // Calculate position of tooltip
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - offset + scrollY;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2) + scrollX;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset + scrollY;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2) + scrollX;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2) + scrollY;
        left = triggerRect.left - tooltipRect.width - offset + scrollX;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2) + scrollY;
        left = triggerRect.right + offset + scrollX;
        break;
      default:
        top = triggerRect.top - tooltipRect.height - offset + scrollY;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2) + scrollX;
    }
    
    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 0) left = 10;
    if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 10;
    if (top < 0) top = 10;
    if (top + tooltipRect.height > viewportHeight + scrollY) top = viewportHeight + scrollY - tooltipRect.height - 10;
    
    setTooltipPosition({ top, left });
  };
  
  // Handle showing and hiding tooltip
  const handleOpen = () => {
    if (controlledIsOpen === undefined) {
      setIsOpen(true);
    }
  };
  
  const handleClose = () => {
    if (controlledIsOpen === undefined) {
      setIsOpen(false);
    }
    if (onClose) {
      onClose();
    }
  };
  
  // Event handlers based on trigger type
  useEffect(() => {
    const triggerEl = triggerRef.current;
    
    if (!triggerEl) return;
    
    if (trigger === 'hover') {
      const handleMouseEnter = () => {
        handleOpen();
      };
      
      const handleMouseLeave = () => {
        handleClose();
      };
      
      triggerEl.addEventListener('mouseenter', handleMouseEnter);
      triggerEl.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        triggerEl.removeEventListener('mouseenter', handleMouseEnter);
        triggerEl.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
    
    if (trigger === 'click') {
      const handleClick = (e) => {
        e.stopPropagation();
        if (tooltipVisible) {
          handleClose();
        } else {
          handleOpen();
        }
      };
      
      triggerEl.addEventListener('click', handleClick);
      
      return () => {
        triggerEl.removeEventListener('click', handleClick);
      };
    }
  }, [trigger, tooltipVisible]);
  
  // Handle click outside
  useEffect(() => {
    if (!closeOnClickOutside || !tooltipVisible || trigger !== 'click') return;
    
    const handleClickOutside = (e) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(e.target) && 
        triggerRef.current && 
        !triggerRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tooltipVisible, closeOnClickOutside, trigger]);
  
  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (tooltipVisible) {
      // Allow DOM update for portal before calculating position
      const timer = setTimeout(() => {
        calculatePosition();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [tooltipVisible, content]);
  
  // Recalculate position on scroll and resize
  useEffect(() => {
    if (!tooltipVisible) return;
    
    const handlePositionUpdate = () => {
      calculatePosition();
    };
    
    window.addEventListener('resize', handlePositionUpdate);
    window.addEventListener('scroll', handlePositionUpdate);
    
    return () => {
      window.removeEventListener('resize', handlePositionUpdate);
      window.removeEventListener('scroll', handlePositionUpdate);
    };
  }, [tooltipVisible]);
  
  // Create tooltip element
  const tooltipElement = tooltipVisible && (
    <div
      ref={tooltipRef}
      className={`tooltip tooltip-${position} tooltip-${animation} ${className}`}
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        maxWidth: `${maxWidth}px`,
        animationDelay: `${delay}ms`,
      }}
      role="tooltip"
    >
      <div className="tooltip-content">
        {content}
      </div>
      {arrow && <div className={`tooltip-arrow tooltip-arrow-${position}`} />}
    </div>
  );
  
  // Render tooltip in portal or inline
  const tooltipPortal = tooltipElement && (
    portalContainer 
      ? createPortal(tooltipElement, portalContainer)
      : createPortal(tooltipElement, document.body)
  );
  
  return (
    <>
      <div 
        ref={triggerRef}
        className="tooltip-trigger"
      >
        {children}
      </div>
      {tooltipPortal}
    </>
  );
};

Tooltip.propTypes = {
  /** The element that triggers the tooltip */
  children: PropTypes.node.isRequired,
  /** Content to display in the tooltip (can be string, JSX, or components) */
  content: PropTypes.node.isRequired,
  /** Position of the tooltip relative to the trigger element */
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  /** Delay before showing the tooltip in milliseconds */
  delay: PropTypes.number,
  /** Animation type for tooltip appearance/disappearance */
  animation: PropTypes.oneOf(['fade', 'scale', 'slide']),
  /** How the tooltip is triggered */
  trigger: PropTypes.oneOf(['hover', 'click']),
  /** Maximum width of the tooltip in pixels */
  maxWidth: PropTypes.number,
  /** Additional CSS classes to add to the tooltip */
  className: PropTypes.string,
  /** Whether to close the tooltip when clicking outside */
  closeOnClickOutside: PropTypes.bool,
  /** Control tooltip visibility externally (for controlled component usage) */
  isOpen: PropTypes.bool,
  /** Callback function when tooltip closes */
  onClose: PropTypes.func,
  /** DOM element to render portal into (defaults to document.body) */
  portalContainer: PropTypes.instanceOf(Element),
  /** Whether to show the arrow pointer */
  arrow: PropTypes.bool,
  /** Distance between tooltip and trigger element in pixels */
  offset: PropTypes.number,
};

export default Tooltip;

