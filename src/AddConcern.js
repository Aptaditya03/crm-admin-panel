import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, push, set, get } from "firebase/database";
import { database } from './firebaseConfig';

function AddConcern() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  
  // 1. Updated state to include all the new fields
  const [formData, setFormData] = useState({
    contactPerson: '',
    designation: '',
    emailId: '',
    phoneNumber: '', // This will be used for "Mobile No"
    didNumber: '',   // This will be used for "DID No"
    contactDate: '',
    contactTime: '',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const clientRef = ref(database, `User/ClientDetails/${clientId}/clientName`);
    get(clientRef).then((snapshot) => {
        if (snapshot.exists()) {
            setClientName(snapshot.val());
        }
    });
  }, [clientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const concernRef = ref(database, `User/ClientDetails/${clientId}/ContactPersonDetails`);
    const newConcernRef = push(concernRef);
    
    // 3. Ensure all new data is included when saving
    const newConcernData = {
        contactPerson: formData.contactPerson,
        designation: formData.designation,
        emailId: formData.emailId,
        phoneNumber: formData.phoneNumber,
        didNumber: formData.didNumber,
        contactDate: formData.contactDate,
        contactTime: formData.contactTime,
        // We will save the first comment in a nested structure for consistency
        comment: {
            [push(ref(database)).key]: { // Generate a unique key for the comment
                comment: formData.comment,
                createdDate: new Date().toISOString(),
                writenBy: "Super Admin" // Placeholder, can be updated with getAuth()
            }
        }
    };

    set(newConcernRef, newConcernData)
      .then(() => {
        alert('New contact person and details added successfully!');
        navigate(-1);
      })
      .catch(error => {
        alert('Failed to add concern. Error: ' + error.message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="form-container modern-form">
      <h2>Add Concern Person</h2>
      {clientName && <p className="form-subheading">For Client: <strong>{clientName}</strong></p>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
            <label htmlFor="contactPerson">Contact Person</label>
            <input id="contactPerson" name="contactPerson" type="text" onChange={handleChange} required />
        </div>
        <div className="form-field">
            <label htmlFor="designation">Designation</label>
            <input id="designation" name="designation" type="text" onChange={handleChange} required />
        </div>
        <div className="form-field">
            <label htmlFor="emailId">Email ID</label>
            <input id="emailId" name="emailId" type="email" onChange={handleChange} required />
        </div>
        {/* 2. Added the new form fields */}
        <div className="form-field">
            <label htmlFor="phoneNumber">Mobile No</label>
            <input id="phoneNumber" name="phoneNumber" type="tel" onChange={handleChange} required />
        </div>
        <div className="form-field">
            <label htmlFor="didNumber">DID No</label>
            <input id="didNumber" name="didNumber" type="tel" onChange={handleChange} />
        </div>
        <div className="form-field">
            <label htmlFor="contactDate">Contact Date</label>
            <input id="contactDate" name="contactDate" type="date" onChange={handleChange} />
        </div>
        <div className="form-field">
            <label htmlFor="contactTime">Contact Time</label>
            <input id="contactTime" name="contactTime" type="time" onChange={handleChange} />
        </div>
        <div className="form-field">
            <label htmlFor="comment">Comment</label>
            <textarea id="comment" name="comment" rows="4" onChange={handleChange}></textarea>
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Contact'}
        </button>
      </form>
    </div>
  );
}

export default AddConcern;