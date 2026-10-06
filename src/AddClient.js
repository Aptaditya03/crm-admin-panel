// import React, { useState } from 'react';
// import { ref, push, set } from "firebase/database";
// import { database } from './firebaseConfig';
// import { getAuth } from 'firebase/auth';

// function AddClient() {
//   const [formData, setFormData] = useState({
//     clientName: '', industryType: '', businessName: '', city: '', state: '', country: 'India',
//     contactPerson: '', designation: '', phoneNumber: '', emailId: ''
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleChange = (e) => {
//     // We get both 'name' and 'value' from the input field
//     const { name, value } = e.target;
    
//     // The [name] uses the input's name attribute as the key (e.g., 'clientName')
//     // and sets its value to what the user typed.
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     const auth = getAuth();
//     const currentUser = auth.currentUser;

//     const clientDetailsRef = ref(database, 'User/ClientDetails');
//     const newClientKey = push(clientDetailsRef).key;

//     const clientData = {
//       clientName: formData.clientName,
//       industryType: formData.industryType,
//       businessName: formData.businessName,
//       city: formData.city,
//       state: formData.state,
//       country: formData.country,
//     };

//     const contactDetailsRef = ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails`);
//     const newContactKey = push(contactDetailsRef).key;
    
//     const contactData = {
//         contactPerson: formData.contactPerson,
//         designation: formData.designation,
//         phoneNumber: formData.phoneNumber,
//         emailId: formData.emailId,
//     };

//     // Set the main client data and the contact person data
//     set(ref(database, `User/ClientDetails/${newClientKey}`), clientData)
//       .then(() => {
//         return set(ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails/${newContactKey}`), contactData);
//       })
//       .then(() => {
//          // Also add to indices
//         set(ref(database, `User/State/${formData.state}/${formData.city}/${newClientKey}`), true);
//         set(ref(database, `User/BusinessName/${formData.businessName}/${newClientKey}`), true);
//         set(ref(database, `User/IndustryType/${formData.industryType}/${newClientKey}`), true);
//         alert('Client added successfully!');
//         // Reset form if needed
//         e.target.reset();
//       })
//       .catch(error => {
//         alert('Failed to add client. Error: ' + error.message);
//       })
//       .finally(() => {
//         setIsSubmitting(false);
//       });
//   };

//   return (
//     <div className="form-container">
//       <h2>Add New Client</h2>
//       <form onSubmit={handleSubmit} className="client-form">
//         <fieldset>
//           <legend>Company Details</legend>
//           <input name="clientName" placeholder="Client/Company Name" onChange={handleChange} required />
//           <input name="businessName" placeholder="Business Name" onChange={handleChange} required />
//           <input name="industryType" placeholder="Vertical / Industry Type" onChange={handleChange} required />
//           <input name="city" placeholder="City" onChange={handleChange} required />
//           <input name="state" placeholder="State" onChange={handleChange} required />
//         </fieldset>
//         <fieldset>
//           <legend>Contact Person Details</legend>
//           <input name="contactPerson" placeholder="Contact Person Name" onChange={handleChange} required />
//           <input name="designation" placeholder="Designation" onChange={handleChange} required />
//           <input name="phoneNumber" type="tel" placeholder="Mobile Number" onChange={handleChange} required />
//           <input name="emailId" type="email" placeholder="Email ID" onChange={handleChange} required />
//         </fieldset>
//         <button type="submit" disabled={isSubmitting}>
//           {isSubmitting ? 'Saving...' : 'Save Client'}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default AddClient;

import React, { useState } from 'react';
import { ref, push, set } from "firebase/database";
import { database } from './firebaseConfig';
import { getAuth } from 'firebase/auth';

function AddClient() {
  const [formData, setFormData] = useState({
    clientName: '', industryType: '', businessName: '', city: '', state: '', country: 'India',
    contactPerson: '', designation: '', phoneNumber: '', emailId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const clientDetailsRef = ref(database, 'User/ClientDetails');
    const newClientKey = push(clientDetailsRef).key;

    const clientData = {
      clientName: formData.clientName,
      industryType: formData.industryType,
      businessName: formData.businessName,
      city: formData.city,
      state: formData.state,
      country: formData.country,
    };

    const contactDetailsRef = ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails`);
    const newContactKey = push(contactDetailsRef).key;

    const contactData = {
      contactPerson: formData.contactPerson,
      designation: formData.designation,
      phoneNumber: formData.phoneNumber,
      emailId: formData.emailId,
    };

    set(ref(database, `User/ClientDetails/${newClientKey}`), clientData)
      .then(() => {
        return set(ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails/${newContactKey}`), contactData);
      })
      .then(() => {
        set(ref(database, `User/State/${formData.state}/${formData.city}/${newClientKey}`), true);
        set(ref(database, `User/BusinessName/${formData.businessName}/${newClientKey}`), true);
        set(ref(database, `User/IndustryType/${formData.industryType}/${newClientKey}`), true);
        alert('Client added successfully!');
        e.target.reset();
      })
      .catch(error => {
        alert('Failed to add client. Error: ' + error.message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '40px auto',
      backgroundColor: '#fff',
      padding: '30px 40px',
      borderRadius: '10px',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    title: {
      textAlign: 'center',
      marginBottom: '25px',
      color: '#333',
    },
    fieldset: {
      border: 'none',
      marginBottom: '20px',
      padding: 0,
    },
    legend: {
      fontWeight: 600,
      color: '#555',
      marginBottom: '10px',
      fontSize: '1.1em',
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      margin: '10px 0',
      border: '1px solid #ccc',
      borderRadius: '6px',
      fontSize: '1rem',
      transition: 'border-color 0.3s ease',
    },
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    },
    buttonDisabled: {
      backgroundColor: '#a0c8ff',
      cursor: 'not-allowed',
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Add New Client</h2>
      <form onSubmit={handleSubmit}>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Company Details</legend>
          <input name="clientName" placeholder="Client/Company Name" onChange={handleChange} required style={styles.input} />
          <input name="businessName" placeholder="Business Name" onChange={handleChange} required style={styles.input} />
          <input name="industryType" placeholder="Vertical / Industry Type" onChange={handleChange} required style={styles.input} />
          <input name="city" placeholder="City" onChange={handleChange} required style={styles.input} />
          <input name="state" placeholder="State" onChange={handleChange} required style={styles.input} />
        </fieldset>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Contact Person Details</legend>
          <input name="contactPerson" placeholder="Contact Person Name" onChange={handleChange} required style={styles.input} />
          <input name="designation" placeholder="Designation" onChange={handleChange} required style={styles.input} />
          <input name="phoneNumber" type="tel" placeholder="Mobile Number" onChange={handleChange} required style={styles.input} />
          <input name="emailId" type="email" placeholder="Email ID" onChange={handleChange} required style={styles.input} />
        </fieldset>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.button,
            ...(isSubmitting ? styles.buttonDisabled : {})
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save Client'}
        </button>
      </form>
    </div>
  );
}

export default AddClient;
