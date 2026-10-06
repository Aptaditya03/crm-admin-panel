// import React, { useState, useEffect } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { ref, onValue } from 'firebase/database';
// import { database } from './firebaseConfig';
// import { getAuth } from 'firebase/auth';

// function EmailPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { recipients } = location.state || { recipients: [] };
  
//   const [templates, setTemplates] = useState([]);
//   const [selectedTemplate, setSelectedTemplate] = useState(null);
//   const [previewBody, setPreviewBody] = useState('');
//   const [loading, setLoading] = useState(false);
//   const currentUser = getAuth().currentUser;

//   // Fetches the email templates and selected template from Firebase
//   useEffect(() => {
//     const templatesRef = ref(database, 'Admin/templates');
//     const unsubscribe = onValue(templatesRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const loadedTemplates = Object.entries(data).map(([id, template]) => ({
//           id,
//           ...template
//         }));
//         setTemplates(loadedTemplates);
        
//         // If we have a template in the location state, select it
//         if (location.state?.template?.id) {
//           const selectedTemplate = loadedTemplates.find(t => t.id === location.state.template.id);
//           setSelectedTemplate(selectedTemplate || loadedTemplates[0]);
//         } else if (loadedTemplates.length > 0) {
//           setSelectedTemplate(loadedTemplates[0]);
//         }
//       }
//     });

//     // Cleanup subscription
//     return () => unsubscribe();
//   }, [location.state?.template?.id]);

//   // Updates the preview when the template or recipients change
//   useEffect(() => {
//     if (!selectedTemplate) {
//       setPreviewBody('');
//       return;
//     }

//     if (recipients.length > 0) {
//       const firstRecipient = recipients[0];
//       try {
//         const personalized = selectedTemplate.body
//           .replace(/\[Name\]/g, firstRecipient.contactName || 'Client')
//           .replace(/\[Client Name\]/g, firstRecipient.clientName || 'Company');
//         setPreviewBody(personalized);
//       } catch (error) {
//         console.error('Error personalizing template:', error);
//         setPreviewBody(selectedTemplate.body || '');
//       }
//     } else {
//       setPreviewBody(selectedTemplate.body || '');
//     }
//   }, [recipients, selectedTemplate]);

//   const openOutlookDraft = () => {
//     if (!selectedTemplate || recipients.length === 0) {
//       alert('Please select a template and ensure you have recipients');
//       return;
//     }

//     try {
//       let mailtoLink = '';
      
//       // Personalize body for each recipient
//       const personalizedBody = recipients.length === 1
//         ? selectedTemplate.body
//             .replace(/\[Name\]/g, recipients[0].contactName || 'Client')
//             .replace(/\[Client Name\]/g, recipients[0].clientName || 'Company')
//         : selectedTemplate.body;
            
//       const subject = encodeURIComponent(selectedTemplate.subject || 'No Subject');
//       const body = encodeURIComponent(personalizedBody);

//       if (recipients.length === 1) {
//         // If there is only one recipient, put them in the "To" field
//         const toEmail = recipients[0].contactEmail;
//         if (!toEmail) {
//           alert('Missing email address for recipient');
//           return;
//         }
//         mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;
//       } else {
//         // If there are multiple recipients, put them in the "BCC" field
//         const bccEmails = recipients
//           .filter(r => r.contactEmail)
//           .map(r => r.contactEmail)
//           .join(',');
          
//         if (!bccEmails) {
//           alert('No valid email addresses found for recipients');
//           return;
//         }
//         mailtoLink = `mailto:?bcc=${bccEmails}&subject=${subject}&body=${body}`;
//       }

//       window.location.href = mailtoLink;
//     } catch (error) {
//       console.error('Error creating email draft:', error);
//       alert('Failed to create email draft. Please try again.');
//     }
//   };
  
//   if (recipients.length === 0) {
//     return (
//       <div className="dashboard-container">
//         <h2>No recipients were selected.</h2>
//         <button onClick={() => navigate('/admin')} className="action-btn">Go Back</button>
//       </div>
//     );
//   }

//   return (
//     <div className="email-page-container">
//       <div className="container py-4">
//         <div className="email-composer-card">
//           <div className="card-header d-flex justify-content-between align-items-center">
//             <h2 className="mb-0">Prepare Email Draft</h2>
//             <button onClick={() => navigate('/admin')} className="btn btn-light">
//               <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
//             </button>
//           </div>
          
//           <div className="card-body p-4">
//             <div className="alert alert-info d-flex align-items-center mb-4">
//               <i className="fas fa-user-circle fs-4 me-3"></i>
//               <div>
//                 <strong>Operating as:</strong> {currentUser.email}
//               </div>
//             </div>

//             {/* Template Selector */}
//             <div className="mb-4">
//               <label className="form-label fw-bold">Template</label>
//               <div className="d-flex align-items-center">
//                 <select 
//                   className="form-select"
//                   value={selectedTemplate?.id || ''}
//                   onChange={(e) => {
//                     const template = templates.find(t => t.id === e.target.value);
//                     setSelectedTemplate(template || null);
//                   }}
//                 >
//                   <option value="">Choose a template...</option>
//                   {templates.map(t => (
//                     <option key={t.id} value={t.id}>{t.name}</option>
//                   ))}
//                 </select>
//                 <button 
//                   type="button" 
//                   className="btn btn-outline-primary ms-3 flex-shrink-0"
//                   onClick={() => navigate('/templates')}
//                 >
//                   <i className="fas fa-cog"></i>
//                 </button>
//               </div>
//             </div>

//             {/* Email Fields */}
//             <div className="email-fields-container border rounded p-3 mb-4">
//               <div className="email-field">
//                 <div className="email-field-label">{recipients.length > 1 ? 'Bcc' : 'To'}</div>
//                 <div className="email-field-content recipient-pill-container">
//                   {recipients.map((recipient, index) => (
//                     <span key={index} className="recipient-pill">
//                       {recipient.contactEmail || recipient.clientName}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//               <div className="email-field">
//                 <div className="email-field-label">Subject</div>
//                 <div className="email-field-content">
//                   <input 
//                     type="text" 
//                     className="email-subject-input" 
//                     readOnly 
//                     value={selectedTemplate?.subject || ''} 
//                     placeholder="Select a template to see the subject"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Email Body */}
//             <div className="email-body-preview mb-4">
//               {previewBody || (
//                 <div className="text-center text-muted d-flex align-items-center justify-content-center h-100">
//                   <div>
//                     <i className="fas fa-envelope fa-3x mb-3 text-light"></i>
//                     <p>Select a template to see the preview</p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Action Button */}
//             <div className="text-end">
//               <button 
//                 onClick={openOutlookDraft} 
//                 className="btn btn-primary-gradient btn-lg px-4 py-2"
//                 disabled={!selectedTemplate || loading}
//               >
//                 <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'} me-2`}></i>
//                 {loading ? 'Creating...' : 'Open Draft'}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default EmailPage;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from './firebaseConfig';
import { getAuth } from 'firebase/auth';

function EmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recipients } = location.state || { recipients: [] };

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewBody, setPreviewBody] = useState('');
  const [loading, setLoading] = useState(false);
  const currentUser = getAuth().currentUser;

  useEffect(() => {
    const templatesRef = ref(database, 'Admin/templates');
    const unsubscribe = onValue(templatesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedTemplates = Object.entries(data).map(([id, template]) => ({
          id,
          ...template
        }));
        setTemplates(loadedTemplates);

        if (location.state?.template?.id) {
          const selectedTemplate = loadedTemplates.find(t => t.id === location.state.template.id);
          setSelectedTemplate(selectedTemplate || loadedTemplates[0]);
        } else if (loadedTemplates.length > 0) {
          setSelectedTemplate(loadedTemplates[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [location.state?.template?.id]);

  useEffect(() => {
    if (!selectedTemplate) {
      setPreviewBody('');
      return;
    }
    if (recipients.length > 0) {
      const firstRecipient = recipients[0];
      try {
        const personalized = selectedTemplate.body
          .replace(/\[Name\]/g, firstRecipient.contactName || 'Client')
          .replace(/\[Client Name\]/g, firstRecipient.clientName || 'Company');
        setPreviewBody(personalized);
      } catch (error) {
        console.error('Error personalizing template:', error);
        setPreviewBody(selectedTemplate.body || '');
      }
    } else {
      setPreviewBody(selectedTemplate.body || '');
    }
  }, [recipients, selectedTemplate]);

  const openOutlookDraft = () => {
    if (!selectedTemplate || recipients.length === 0) {
      alert('Please select a template and ensure you have recipients');
      return;
    }
    try {
      setLoading(true);
      let mailtoLink = '';

      const personalizedBody = recipients.length === 1
        ? selectedTemplate.body
            .replace(/\[Name\]/g, recipients[0].contactName || 'Client')
            .replace(/\[Client Name\]/g, recipients[0].clientName || 'Company')
        : selectedTemplate.body;

      const subject = encodeURIComponent(selectedTemplate.subject || 'No Subject');
      const body = encodeURIComponent(personalizedBody);

      if (recipients.length === 1) {
        const toEmail = recipients[0].contactEmail;
        if (!toEmail) {
          alert('Missing email address for recipient');
          setLoading(false);
          return;
        }
        mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;
      } else {
        const bccEmails = recipients
          .filter(r => r.contactEmail)
          .map(r => r.contactEmail)
          .join(',');
        if (!bccEmails) {
          alert('No valid email addresses found for recipients');
          setLoading(false);
          return;
        }
        mailtoLink = `mailto:?bcc=${bccEmails}&subject=${subject}&body=${body}`;
      }
      window.location.href = mailtoLink;
    } catch (error) {
      console.error('Error creating email draft:', error);
      alert('Failed to create email draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (recipients.length === 0) {
    return (
      <div style={styles.container}>
        <h2>No recipients were selected.</h2>
        <button onClick={() => navigate('/admin')} style={styles.backButton}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.title}>Prepare Email Draft</h2>
          <button onClick={() => navigate('/admin')} style={styles.backBtn}>
            ← Back to Dashboard
          </button>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.userInfo}>
            <strong>Operating as:</strong> {currentUser.email}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={styles.label}>Template</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                style={styles.select}
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  setSelectedTemplate(template || null);
                }}
              >
                <option value="">Choose a template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="button"
                style={styles.configBtn}
                onClick={() => navigate('/templates')}
                title="Manage Templates"
              >
                ⚙️
              </button>
            </div>
          </div>
          <div style={styles.emailFields}>
            <div style={styles.emailField}>
              <div style={styles.fieldLabel}>{recipients.length > 1 ? 'Bcc' : 'To'}</div>
              <div style={styles.recipientContainer}>
                {recipients.map((recipient, index) => (
                  <span key={index} style={styles.recipientPill}>
                    {recipient.contactEmail || recipient.clientName}
                  </span>
                ))}
              </div>
            </div>
            <div style={styles.emailField}>
              <div style={styles.fieldLabel}>Subject</div>
              <input
                type="text"
                style={styles.subjectInput}
                readOnly
                value={selectedTemplate?.subject || ''}
                placeholder="Select a template to see the subject"
              />
            </div>
          </div>
          <div style={styles.previewBox}>
            {previewBody ? (
              <pre style={styles.previewText}>{previewBody}</pre>
            ) : (
              <div style={styles.previewEmpty}>
                <p style={{ color: '#888' }}>Select a template to see the preview</p>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={openOutlookDraft}
              style={styles.sendButton}
              disabled={!selectedTemplate || loading}
            >
              {loading ? 'Creating...' : 'Open Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: '#f5f7fa',
    minHeight: '100vh',
    padding: '2rem',
    fontFamily: 'Inter, sans-serif'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    maxWidth: '960px',
    margin: '0 auto',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5eaf1',
    backgroundColor: '#f9fafc'
  },
  title: {
    fontSize: '1.5rem',
    color: '#333',
    margin: 0
  },
  backBtn: {
    backgroundColor: '#e9eef5',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  cardBody: {
    padding: '1.5rem'
  },
  userInfo: {
    backgroundColor: '#edf3ff',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    color: '#2c3e50'
  },
  label: {
    fontWeight: '600',
    marginBottom: '0.5rem',
        display: 'block',
    color: '#333',
  },
  select: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    maxWidth: '300px',
    width: '100%',
  },
  configBtn: {
    marginLeft: '1rem',
    padding: '0.5rem 0.75rem',
    fontSize: '1.25rem',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emailFields: {
    backgroundColor: '#f7f9fb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  emailField: {
    marginBottom: '1rem',
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#555',
  },
  recipientContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  recipientPill: {
    backgroundColor: '#e3ebff',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#1a3e8b',
    fontWeight: '500',
  },
  subjectInput: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
  },
  previewBox: {
    border: '1px solid #e1e5ea',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1rem',
    minHeight: '150px',
    marginBottom: '1.5rem',
  },
  previewText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: '#333',
  },
  previewEmpty: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#999',
    fontSize: '0.95rem',
  },
  sendButton: {
    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    border: 'none',
    color: '#fff',
    fontWeight: '600',
    fontSize: '1rem',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Inter, sans-serif',
    padding: '2rem',
  },
  backButton: {
    marginTop: '1rem',
    background: '#ddd',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
  },
};

export default EmailPage;
