// src/AdminDashboard.js

// ... (keep existing code from line 1 to 710)

      <div className="d-flex justify-content-start align-items-center mb-4">
        <button 
            onClick={() => setActiveSection('report')} 
            className="btn me-2 rounded-pill" 
            style={{ backgroundColor: '#0d6efd', color: 'white' }}
        >
            Report
        </button>
        <button 
            onClick={() => setActiveSection('admin')} 
            className="btn me-2 rounded-pill"
            style={{ backgroundColor: '#6c757d', color: 'white' }}
        >
            Admin
        </button>
        <div className="position-relative">
            <button 
                onClick={() => setIsExportDropdownOpen(prev => !prev)}
                className="btn me-2 rounded-pill"
                style={{ backgroundColor: '#0dcaf0', color: 'white' }}
            >
                Available Export
            </button>
        </div>
        <button 
            onClick={() => handleDownload('all')}
            className="btn me-2 rounded-pill"
            style={{ backgroundColor: '#000000', color: 'white' }}
        >
            All Export
        </button>
        
        {/* --- START: MODIFIED DOWNLOAD BUTTON --- */}
        {activeSection === 'admin' ? (
          <a
            href="/Example.xlsx" // The path to your file in the public folder
            download="client_upload_template.xlsx" // This is the filename the user will see
            className="btn me-2 rounded-pill"
            style={{ backgroundColor: '#198754', color: 'white', textDecoration: 'none' }}
          >
            Download Template
          </a>
        ) : (
          <button 
            onClick={() => handleDownload('report')}
            className="btn me-2 rounded-pill"
            style={{ backgroundColor: '#198754', color: 'white' }}
          >
            Download Report
          </button>
        )}
        {/* --- END: MODIFIED DOWNLOAD BUTTON --- */}
      </div>

// ... (The rest of the file remains the same)