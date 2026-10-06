import React, { useState, useEffect, useRef } from 'react';

const MultiSelectDropdown = ({ 
  options = [], 
  selectedValues = {}, 
  onAdd, 
  onRemove, 
  placeholder = "Select items...", 
  disabled = false,
  label 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedCount = Object.keys(selectedValues).length;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleCheckboxChange = (value, isChecked) => {
    if (isChecked) {
      onAdd(value);
    } else {
      onRemove(value);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="multi-select-container" ref={wrapperRef}>
      {label && <label className="form-label text-muted">{label}</label>}
      <div className="position-relative">
        <button 
          className={`btn btn-outline-secondary dropdown-toggle w-100 d-flex justify-content-between align-items-center ${disabled ? 'disabled' : ''}`}
          type="button"
          onClick={handleToggle}
          style={{ fontSize: '0.8rem' }}
          disabled={disabled}
        >
          <span>
            {selectedCount > 0 ? `${selectedCount} selected` : placeholder}
          </span>
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </button>
        
        {isOpen && !disabled && (
          <div className="dropdown-menu show w-100 position-absolute" 
               style={{ 
                 maxHeight: '200px', 
                 overflowY: 'auto', 
                 zIndex: 1050,
                 top: '100%',
                 left: 0,
                 right: 0
               }}>
            {options.length > 0 ? (
              options.map(option => (
                <label key={option} className="dropdown-item d-flex align-items-center mb-0" 
                       style={{ cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    className="form-check-input me-2"
                    checked={!!selectedValues[option]}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCheckboxChange(option, e.target.checked);
                    }}
                  />
                  <span style={{ fontSize: '0.8rem' }}>{option}</span>
                </label>
              ))
            ) : (
              <div className="dropdown-item text-muted">No options available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;