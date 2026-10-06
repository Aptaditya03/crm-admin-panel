import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from './firebaseConfig';

function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [editingKey, setEditingKey] = useState(null);

  useEffect(() => {
    const templatesRef = ref(database, 'Admin/templates');
    onValue(templatesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTemplates = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setTemplates(loadedTemplates);
      setIsLoading(false);
    });
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.body) return alert("All fields are required.");

    if (editingKey) {
      // Update existing template
      set(ref(database, `Admin/templates/${editingKey}`), form);
    } else {
      // Add new template
      const newTemplateRef = push(ref(database, 'Admin/templates'));
      set(newTemplateRef, form);
    }
    setForm({ name: '', subject: '', body: '' });
    setEditingKey(null);
  };

  const handleEdit = (template) => {
    setEditingKey(template.id);
    setForm({ name: template.name, subject: template.subject, body: template.body });
  };
  
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
        remove(ref(database, `Admin/templates/${id}`));
    }
  };

  const handleCancel = () => {
    setForm({ name: '', subject: '', body: '' });
    setEditingKey(null);
  };

  if (isLoading) return <div>Loading templates...</div>;

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0 h5">
                <i className="fas fa-list me-2"></i>
                Your Templates
              </h3>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {templates.map(t => (
                  <div key={t.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{t.name}</h6>
                        <small className="text-muted">{t.subject}</small>
                      </div>
                      <div className="btn-group">
                        <button 
                          onClick={() => handleEdit(t)} 
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)} 
                          className="btn btn-sm btn-outline-danger"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="text-center p-4 text-muted">
                    <i className="fas fa-inbox fa-2x mb-2"></i>
                    <p>No templates yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0 h5">
                <i className="fas fa-edit me-2"></i>
                {editingKey ? 'Edit Template' : 'Create New Template'}
              </h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label">Template Name</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Enter template name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Subject Line</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={form.subject}
                    onChange={e => setForm({...form, subject: e.target.value})}
                    placeholder="Enter email subject"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email Body</label>
                  <div className="form-text mb-2">
                    Use <code>[Name]</code> for recipient's name and <code>[Client Name]</code> for company name
                  </div>
                  <textarea 
                    className="form-control"
                    value={form.body}
                    onChange={e => setForm({...form, body: e.target.value})}
                    rows="12"
                    placeholder="Enter email body content..."
                    required
                  ></textarea>
                </div>

                <div className="d-flex justify-content-between gap-2">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={handleCancel}
                  >
                    <i className="fas fa-times me-2"></i>
                    {editingKey ? 'Cancel Edit' : 'Clear Form'}
                  </button>
                  <div>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>
                      {editingKey ? 'Update Template' : 'Save Template'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateManager;