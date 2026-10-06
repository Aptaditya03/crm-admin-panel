import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { ref, onValue, update, push, set, get } from "firebase/database";
import { database } from './firebaseConfig';
import Modal from './Modal';
import { getAuth } from 'firebase/auth';
import * as XLSX from 'xlsx';
import CustomSelect from './CustomSelect'; // Import the new component
import './App.css';
import './AdminDashboard.css';
import { useParams } from 'react-router-dom';
import MultiSelectDropdown from './MultiSelectDropdown';
import { useDebounce, usePagination } from './hooks';
import Pagination from './components/Pagination';
import { matchesEmailFilter, buildSelectedClientDeletes } from './clientAdminUtils';

function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('');
  const [states, setStates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [businessNames, setBusinessNames] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [activeSection, setActiveSection] = useState('report');
  const [showTable, setShowTable] = useState(true);
  const [selectedClients, setSelectedClients] = useState({});
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [modalState, setModalState] = useState({ type: null, client: null });
  const [commentText, setCommentText] = useState('');
  const [meetingDetails, setMeetingDetails] = useState({ date: '', time: '', topic: '' });
  const [permissions, setPermissions] = useState({ states: {}, cities: {}, businessNames: {}, industryTypes: {} });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [permSelection, setPermSelection] = useState({ state: '', city: '', businessName: '', industryType: '' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableContainerRef = useRef(null);
  const skipPaginationResetRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    state: '',
    city: '',
    user: ''
  });
  const [exportFilteredData, setExportFilteredData] = useState([]);
 

  const [searchTerm, setSearchTerm] = useState(''); // New state for global search
  const fileInputRef = useRef(null);

  const [hoveredCell, setHoveredCell] = useState({ row: null, column: null });
  const [newClientRecord, setNewClientRecord] = useState(null);
  const [discussedByOptions, setDiscussedByOptions] = useState([]);
  const [selectedDiscussedBy, setSelectedDiscussedBy] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmailFilter, setSelectedEmailFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const deletionInProgressRef = useRef(false);

  // PERFORMANCE OPTIMIZATION: Debounce search term to prevent excessive filtering on large datasets
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // PERFORMANCE OPTIMIZATION: Pagination for large datasets
  const pagination = usePagination(filteredClients, 100);

  // Check if all visible clients are selected (only check current page for performance)
  const isAllSelected = useMemo(() => {
    return pagination.paginatedData.length > 0 && 
           pagination.paginatedData.every(client => selectedClients[client.id]);
  }, [pagination.paginatedData, selectedClients]);

  // State for dropdown options
  const [statesOptions, setStatesOptions] = useState({});
  const [businessNamesOptions, setBusinessNamesOptions] = useState([]);
  const [verticalsOptions, setVerticalsOptions] = useState([]);
  const [allUsersOptions, setAllUsersOptions] = useState([]);
  const [superAdminEmails, setSuperAdminEmails] = useState([]);

  // State for work status dropdown
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);

  // Default work status options with colors
  const defaultStatusOptions = [
    { value: 'no-call', label: 'No Call', color: '#000000' },
    { value: 'do-not-call', label: 'Do Not Call Again', color: '#dc3545' },
    { value: 'call-tomorrow', label: 'Call Tomorrow', color: '#ff8c00' },
    { value: 'follow-up', label: 'Follow Up', color: '#ffc107' },
    { value: 'lead', label: 'Lead', color: '#28a745' },
    { value: 'concern-person', label: 'Concern Person', color: '#007bff' }
  ];

  // Work status options with customizable colors
  const [workStatusOptions, setWorkStatusOptions] = useState(() => {
    const savedColors = localStorage.getItem('workStatusColors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        return defaultStatusOptions.map(opt => ({
          ...opt,
          color: parsed[opt.value] || opt.color
        }));
      } catch (e) {
        return defaultStatusOptions;
      }
    }
    return defaultStatusOptions;
  });

  const abbreviateText = (text, maxLength = 2) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength + 1) return text;
    return text.substring(0, maxLength).toUpperCase();
  };
  const abbreviateBusiness = (business) => abbreviateText(business, 3);
  const abbreviateVertical = (vertical) => abbreviateText(vertical, 4);
  const abbreviateState = (state) => {
    const stateAbbreviations = { 'maharashtra': 'MH', 'gujarat': 'GJ', 'karnataka': 'KA', /* ...add more as needed... */ };
    return stateAbbreviations[state?.toLowerCase()] || abbreviateText(state, 2);
  };
 

const [initialPermissions, setInitialPermissions] = useState({ states: {}, cities: {}, businessNames: {}, industryTypes: {} });

const [allRolesData, setAllRolesData] = useState(null);
  const abbreviateCountry = (country) => {
    const countryAbbreviations = { 'india': 'IN', 'united states': 'US', /* ...add more... */ };
    return countryAbbreviations[country?.toLowerCase()] || abbreviateText(country, 2);
  };
  const { uid } = useParams();
 

  useEffect(() => {
    
    if (uid) {
      console.log("The currently active admin's UID is:", uid);
     
    }
  }, [uid]); 
  useEffect(() => {
    // Restore scroll position after a manual refresh
    setIsRefreshing(false);
    const savedScrollPos = sessionStorage.getItem('manualScrollPos');
    if (savedScrollPos && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = parseInt(savedScrollPos, 10);
      sessionStorage.removeItem('manualScrollPos'); // Clean up
    }
    const didRefresh = sessionStorage.getItem('didManualRefresh');
    if (didRefresh) {
      sessionStorage.removeItem('didManualRefresh'); // Clear the flag
      setShowRefreshToast(true); // Show the toast
      
      // Hide the toast after 3 seconds
      setTimeout(() => {
        setShowRefreshToast(false);
      }, 3000);
    }
  }, [filteredClients]);

  useEffect(() => {
    const clientsRef = ref(database, 'User/ClientDetails');
    const statesRef = ref(database, 'Admin/State');
    const businessRef = ref(database, 'Admin/BusinessName');
    const verticalRef = ref(database, 'Admin/IndustryType');
    const usersRef = ref(database, 'Admin/UserUid');
    const managerRef = ref(database, 'Admin/Role/Manager');

    onValue(managerRef, (snapshot) => {
      const managerData = snapshot.val();
      const adminEmails = managerData ? Object.values(managerData) : [];
      setSuperAdminEmails(adminEmails);

      onValue(usersRef, (usersSnapshot) => {
        const usersData = usersSnapshot.val();
        const usersList = usersData ? Object.keys(usersData).map(uid => ({ 
            uid, 
            email: usersData[uid].email || usersData[uid], // Handles both object and string structures
            whatsapp: usersData[uid].whatsapp 
        })) : [];
        setAllUsers(usersList.filter(user => !adminEmails.includes(user.email)));
        setUsersLoaded(true);
      });
    });

    onValue(clientsRef, (snapshot) => {
      const data = snapshot.val();
      setClients(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
      setClientsLoaded(true);
    });
    
    onValue(statesRef, (snapshot) => setStatesOptions(snapshot.val() || {}));
    onValue(businessRef, (snapshot) => setBusinessNamesOptions(snapshot.val() ? Object.keys(snapshot.val()) : []));
    onValue(verticalRef, (snapshot) => setVerticalsOptions(snapshot.val() ? Object.keys(snapshot.val()) : []));

    // Load status colors from Firebase
    const colorRef = ref(database, 'Admin/StatusColors');
    onValue(colorRef, (snapshot) => {
      if (snapshot.exists()) {
        const colorMap = snapshot.val();
        setWorkStatusOptions(prev => prev.map(opt => ({
          ...opt,
          color: colorMap[opt.value] || opt.color
        })));
        localStorage.setItem('workStatusColors', JSON.stringify(colorMap));
      }
    });
  }, [refreshTrigger]);


 
useEffect(() => {
    const rolesRef = ref(database, 'Admin/Role/StateAdmin');
    onValue(rolesRef, (snapshot) => {
        if (snapshot.exists()) {
            setAllRolesData(snapshot.val());
        }
    });
}, []);

  useEffect(() => {
    if (clientsLoaded && usersLoaded) {
      setIsLoading(false);
    }
  }, [clientsLoaded, usersLoaded]);

  const handleSendEmail = () => {
    // 1. Get the array of selected client objects
    const selectedRecipients = Object.values(selectedClients)
      .map(client => {
        // 2. Safely find the contact details inside each client, ignoring comments
        const contactDetails = client.ContactPersonDetails || {};
   const contactKey = Object.keys(client.ContactPersonDetails || {}).find(key => key !== 'comment');
        const contact = contactKey ? client.ContactPersonDetails[contactKey] : {};
        
        // 3. If a contact with an email is found, prepare the recipient object
        return contact.emailId ? {
          clientName: client.clientName,
          contactName: contact.contactPerson,
          contactEmail: contact.emailId
        } : null;
      })
      .filter(Boolean); // 4. Remove any clients that didn't have an email

    if (selectedRecipients.length === 0) {
      alert('Please select clients with valid email addresses.');
      return;
    }

    // 5. Navigate to the email page with the recipient data
    navigate('/email', { state: { recipients: selectedRecipients } });
};

  // PERFORMANCE OPTIMIZATION: Effect to apply filters with debounced search
  // Track previous filter values to detect actual filter changes vs data updates
  const prevFiltersRef = useRef({ selectedState: '', selectedCity: '', selectedBusiness: '', selectedUser: '', debouncedSearchTerm: '', selectedVertical: '', selectedDate: '', selectedDiscussedBy: 'All', selectedStatus: '', selectedEmailFilter: '' });

  useEffect(() => {
    let result = clients;
    
    if (!debouncedSearchTerm) {
      // Apply dropdown filters only when search is empty
      if (selectedState) {
        result = result.filter(client => client.state === selectedState);
      }
      if (selectedCity) {
        result = result.filter(client => client.city === selectedCity);
      }
      if (selectedBusiness) {
        result = result.filter(client => client.businessName === selectedBusiness);
      }
      if (selectedVertical) {
        result = result.filter(client => client.industryType === selectedVertical);
      }
      if (selectedUser && selectedUser !== 'all') {
        const user = allUsers.find(u => u.uid === selectedUser);
        const assignedClientIds = new Set(user?.clientIds || []);
        result = result.filter(client => assignedClientIds.has(client.id));
      }
      if (selectedDate) {
        result = result.filter(client => {
          const details = client.ContactPersonDetails || {};
          const commentsNode = details.comment || {};
          const allComments = Object.values(commentsNode).flatMap(Object.values);
          
          return allComments.some(comment => {
            if (comment.createdDate) {
              const commentDate = new Date(comment.createdDate).toLocaleDateString('en-CA'); // YYYY-MM-DD format
              return commentDate === selectedDate;
            }
            return false;
          });
      });
      }
      // Discussed By Filter
      if (selectedDiscussedBy && selectedDiscussedBy !== 'All') {
        result = result.filter(client => {
          const details = client.ContactPersonDetails || {};
          const commentsNode = details.comment || {};
          const allComments = Object.values(commentsNode).flatMap(Object.values);
          
          return allComments.some(comment => {
            if (comment.writtenBy) {
              const username = comment.writtenBy.split('@')[0];
              return username === selectedDiscussedBy;
            }
            return false;
          });
        });
      }
    } else {
      // PERFORMANCE OPTIMIZATION: Global search with debounced term
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(client => {
        const details = client.ContactPersonDetails || {};
        const contactKey = Object.keys(details).find(key => key !== 'comment');
        const contact = contactKey ? details[contactKey] : {};
        
        return (
          (client.clientName && client.clientName.toLowerCase().includes(searchLower)) ||
          (client.businessName && client.businessName.toLowerCase().includes(searchLower)) ||
          (client.industryType && client.industryType.toLowerCase().includes(searchLower)) ||
          (client.state && client.state.toLowerCase().includes(searchLower)) ||
          (client.city && client.city.toLowerCase().includes(searchLower)) ||
          (contact.contactPerson && contact.contactPerson.toLowerCase().includes(searchLower)) ||
          (contact.phoneNumber && String(contact.phoneNumber).includes(debouncedSearchTerm)) ||
          (contact.emailId && contact.emailId.toLowerCase().includes(searchLower))
        );
      });
    }

    // Status Filter - applies regardless of search term
    if (selectedStatus) {
      result = result.filter(client => client.status?.value === selectedStatus);
    }

    result = result.filter(client => matchesEmailFilter(client, selectedEmailFilter));
    setFilteredClients(result);
    
    // Check if any actual filter changed (not just data)
    const filtersChanged = 
      prevFiltersRef.current.selectedState !== selectedState ||
      prevFiltersRef.current.selectedCity !== selectedCity ||
      prevFiltersRef.current.selectedBusiness !== selectedBusiness ||
      prevFiltersRef.current.selectedUser !== selectedUser ||
      prevFiltersRef.current.debouncedSearchTerm !== debouncedSearchTerm ||
      prevFiltersRef.current.selectedVertical !== selectedVertical ||
      prevFiltersRef.current.selectedDate !== selectedDate ||
      prevFiltersRef.current.selectedDiscussedBy !== selectedDiscussedBy ||
      prevFiltersRef.current.selectedStatus !== selectedStatus ||
      prevFiltersRef.current.selectedEmailFilter !== selectedEmailFilter;
    
    // Only reset pagination if filters actually changed
    if (filtersChanged) {
      pagination.resetPagination();
      prevFiltersRef.current = { selectedState, selectedCity, selectedBusiness, selectedUser, debouncedSearchTerm, selectedVertical, selectedDate, selectedDiscussedBy, selectedStatus, selectedEmailFilter };
    }
  }, [selectedState, selectedCity, selectedBusiness, selectedUser, debouncedSearchTerm, clients, allUsers, selectedVertical, selectedDate, selectedDiscussedBy, selectedStatus, selectedEmailFilter]);

  const handleDeleteSelected = async () => {
    if (deletionInProgressRef.current) return;
    const selectedIds = Object.keys(selectedClients);
    if (!selectedIds.length) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected record(s)? This includes their contact details and comments. Selections on other pages or hidden by filters are included. This cannot be undone.`)) return;
    deletionInProgressRef.current = true;
    setIsDeleting(true);
    try {
      const updates = buildSelectedClientDeletes(selectedIds);
      await update(ref(database, 'User/ClientDetails'), updates);
      const deletedIds = new Set(selectedIds);
      setSelectedClients(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !deletedIds.has(id))));
      setClients(previous => previous.filter(client => !deletedIds.has(client.id)));
      pagination.resetPagination();
      if (deletedIds.has(editingClientId)) handleCancelClick();
      alert(`Deleted ${selectedIds.length} selected record(s).`);
    } catch (error) {
      alert('Could not delete selected records: ' + error.message);
    } finally {
      deletionInProgressRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleEditClick = (clientId, field) => {
    setEditingClientId(clientId);
    setEditingField(field);
    const client = clients.find(c => c.id === clientId);
    const contact = client.ContactPersonDetails ? Object.values(client.ContactPersonDetails)[0] : {};
    setEditFormData({
        ...client,
        ...contact
    });
  };
  const handleRefresh = () => {
  const container = tableContainerRef.current;
  if (container) {
    // Save current scroll position to session storage
    sessionStorage.setItem('manualScrollPos', container.scrollTop);
  }
  sessionStorage.setItem('didManualRefresh', 'true'); // Flag to show toast later
  setIsRefreshing(true);

  // Trigger the data fetching useEffect
  setRefreshTrigger(prev => prev + 1);
};

  const handleCancelClick = () => {
    setEditingClientId(null);
    setEditingField(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveClick = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const contactId = client?.ContactPersonDetails ? Object.keys(client.ContactPersonDetails)[0] : null;

    const contactFields = ['contactPerson', 'designation', 'phoneNumber', 'contactPersonNumber', 'didNumber', 'emailId'];

    if (!contactId && contactFields.includes(editingField)) {
        return alert("Could not find contact details to update.");
    }

    const updates = {};
    let path;
    if (contactFields.includes(editingField)) {
        path = `/User/ClientDetails/${clientId}/ContactPersonDetails/${contactId}/${editingField}`;
    } else {
        path = `/User/ClientDetails/${clientId}/${editingField}`;
    }
    
    updates[path] = editFormData[editingField];

    update(ref(database), updates)
      .then(() => {
        // alert("Client details updated successfully!");
        handleCancelClick();
      })
      .catch(err => {
        alert("Error updating client: " + err.message);
      });
  };

  const allCities = useMemo(() => {
    if (!statesOptions) return [];
    const citySet = new Set(Object.values(statesOptions).flatMap(cityObj => Object.keys(cityObj)));
    return Array.from(citySet).sort();
  }, [statesOptions]);

  // PERFORMANCE OPTIMIZATION: Memoized client selection handler
  const handleSelectClient = useCallback((client) => {
    setSelectedClients(prev => {
      const newSelected = { ...prev };
      if (newSelected[client.id]) {
        delete newSelected[client.id];
      } else {
        newSelected[client.id] = client;
      }
      return newSelected;
    });
  }, []);

  // PERFORMANCE OPTIMIZATION: Select only current page clients for better performance
  const handleSelectAllClients = useCallback((checked) => {
    setSelectedClients(prev => {
      const newSelected = { ...prev };
      // Only select/deselect clients on the current page
      pagination.paginatedData.forEach(client => {
        if (checked) {
          newSelected[client.id] = client;
        } else {
          delete newSelected[client.id];
        }
      });
      return newSelected;
    });
  }, [pagination.paginatedData]);

  const handleOpenModal = useCallback((type, client) => {
    setModalState({ type, client });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ type: null, client: null });
    setCommentText('');
    setMeetingDetails({ date: '', time: '', topic: '' });
  }, []);

  // Handle work status update - saves to User/ClientDetails/{clientId}/status
  const handleUpdateWorkStatus = useCallback((clientId, newStatus) => {
    const user = getAuth().currentUser;
    if (!user) {
      alert("You must be logged in to update status");
      return;
    }

    // Find the color for this status
    const statusOption = workStatusOptions.find(opt => opt.value === newStatus);
    const statusColor = statusOption ? statusOption.color : '#000000';
    const statusLabel = statusOption ? statusOption.label : 'No Call';

    // Status data to save
    const statusData = {
      value: newStatus,
      label: statusLabel,
      color: statusColor,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email
    };

    // Use update with full path for reliable write
    const updates = {};
    updates[`User/ClientDetails/${clientId}/status`] = statusData;
    
    update(ref(database), updates)
      .then(() => {
        // Update local state
        const updateClientStatus = (c) => {
          if (c.id !== clientId) return c;
          return { ...c, status: statusData };
        };
        setClients(prev => prev.map(updateClientStatus));
        setFilteredClients(prev => prev.map(updateClientStatus));
        setActiveStatusDropdown(null);
      })
      .catch(err => {
        alert("Error updating status: " + err.message);
      });
  }, [workStatusOptions]);

  // Get status color for a client
  const getStatusColor = (client) => {
    if (client.status?.color) {
      return client.status.color;
    }
    const statusValue = client.status?.value || 'no-call';
    const statusOption = workStatusOptions.find(opt => opt.value === statusValue);
    return statusOption ? statusOption.color : '#000000';
  };

  // Get status label for a client
  const getStatusLabel = (client) => {
    if (client.status?.label) {
      return client.status.label;
    }
    const statusValue = client.status?.value || 'no-call';
    const statusOption = workStatusOptions.find(opt => opt.value === statusValue);
    return statusOption ? statusOption.label : 'No Call';
  };

  // Get current status value for a client
  const getStatusValue = (client) => {
    return client.status?.value || 'no-call';
  };

  const handleAddClientFromTemplate = (client) => {
    setNewClientRecord({
      businessName: client.businessName,
      industryType: client.industryType,
      country: client.country,
      state: client.state,
      city: client.city,
      clientName: client.clientName, // Left blank for the new client
      ContactPersonDetails: {
        contactPerson: '',
        designation: '',
        phoneNumber: '',
        emailId: ''
      }
    });
    window.scrollTo(0, 0);
};

  // *** NEW from MyClients.js ***: Handler for input changes in the new row
  const handleNewClientInputChange = (e) => {
    const { name, value } = e.target;
    const updatedRecord = { ...newClientRecord };
    if (name in updatedRecord.ContactPersonDetails) {
      updatedRecord.ContactPersonDetails[name] = value;
    } else {
      updatedRecord[name] = value;
    }
    setNewClientRecord(updatedRecord);
  };

  // *** NEW from MyClients.js ***: Handler to save the new client on Enter press
  const handleSaveNewClient = async (e) => {
    if (e.key === 'Enter') {
      const { clientName, ContactPersonDetails } = newClientRecord;
      const { contactPerson, phoneNumber, emailId } = ContactPersonDetails;
      
      if (!clientName || !contactPerson || !phoneNumber) {
        return alert("Please fill in Client Name, Contact Person, and Phone Number");
      }

      // Check for duplicate phone number
      const phoneExists = clients.some(client => {
        if (client.ContactPersonDetails) {
          const contactKeys = Object.keys(client.ContactPersonDetails).filter(key => key !== 'comment');
          return contactKeys.some(key => {
            const contact = client.ContactPersonDetails[key];
            return contact && contact.phoneNumber === phoneNumber.trim();
          });
        }
        return false;
      });

      if (phoneExists) {
        return alert("A client with this phone number already exists!");
      }

      try {
        const clientRef = push(ref(database, 'User/ClientDetails'));
        const contactRef = push(ref(database, `User/ClientDetails/${clientRef.key}/ContactPersonDetails`));
        
        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, '0')}_${String(today.getMonth() + 1).padStart(2, '0')}_${today.getFullYear()}`;
        
        const updates = {};
        updates[`User/ClientDetails/${clientRef.key}`] = {
          ...newClientRecord,
          ContactPersonDetails: undefined,
          createdDate: formattedDate
        };
        
        updates[`User/ClientDetails/${clientRef.key}/ContactPersonDetails/${contactRef.key}`] = ContactPersonDetails;
        
        await update(ref(database), updates);
        alert("New client added successfully!");
        setNewClientRecord(null);
      } catch (error) {
        console.error("Error adding client:", error);
        alert("Error adding client: " + error.message);
      }
    }
};
  // --- START: CORRECTED COMMENT HANDLER FOR ADMIN DASHBOARD ---
  const handleAddComment = () => {
  if (!commentText) return alert("Please enter a comment.");
  
  const { client } = modalState;
  if (!client.ContactPersonDetails) return alert("This client has no contact details.");

  const commentBasePath = `/User/ClientDetails/${client.id}/ContactPersonDetails/comment`;
  const commentBaseRef = ref(database, commentBasePath);

  const firstPushKey = push(commentBaseRef).key;
  const secondPushKey = push(ref(database, `${commentBasePath}/${firstPushKey}`)).key;

  const finalCommentPath = `${commentBasePath}/${firstPushKey}/${secondPushKey}`;
  const finalCommentRef = ref(database, finalCommentPath);

  const newComment = {
    commentmsg: commentText,
    createdDate: new Date().toISOString(),
    writtenBy: getAuth().currentUser.email
  };

  set(finalCommentRef, newComment)
    .then(() => {
      const updateClientData = (clientList) => {
        return clientList.map(c => {
          if (c.id === client.id) {
            const updatedClient = { ...c };
            if (!updatedClient.ContactPersonDetails.comment) {
              updatedClient.ContactPersonDetails.comment = {};
            }
            if (!updatedClient.ContactPersonDetails.comment[firstPushKey]) {
              updatedClient.ContactPersonDetails.comment[firstPushKey] = {};
            }
            updatedClient.ContactPersonDetails.comment[firstPushKey][secondPushKey] = newComment;
            return updatedClient;
          }
          return c;
        });
      };

      // Skip pagination reset when only updating comment data
      skipPaginationResetRef.current = true;
      setClients(prevClients => updateClientData(prevClients));
      setFilteredClients(prevClients => updateClientData(prevClients));

      alert("Comment added successfully!");
      handleCloseModal();
    })
    .catch(err => alert("Error: " + err.message));
  };
  // --- END: CORRECTED COMMENT HANDLER FOR ADMIN DASHBOARD ---
  
  const handleSetMeeting = () => {
    if (!meetingDetails.date || !meetingDetails.topic) return alert("Please provide a date and topic.");
    const { client } = modalState;
    const meetingRef = ref(database, `/User/ClientDetails/${client.id}/meetings`);
    const newMeetingRef = push(meetingRef);
    const newMeeting = {
        date: meetingDetails.date,
        time: meetingDetails.time,
        topic: meetingDetails.topic,
        scheduledBy: getAuth().currentUser.email,
        createdAt: new Date().toISOString()
    };
    set(newMeetingRef, newMeeting)
      .then(() => {
          alert(`Meeting set successfully for ${client.clientName} on ${meetingDetails.date}`);
          handleCloseModal();
      })
      .catch(err => alert("Error setting meeting: " + err.message));
  };

//   const savePermissions = () => {
//     if (!selectedUserId) return alert("Please select an employee first.");
//     const updates = {};
//     Object.keys(permissions.cities).forEach(city => {
//       const state = Object.keys(statesOptions).find(s => statesOptions[s] && statesOptions[s][city]);
//       if (state) {
//         updates[`/Admin/Role/StateAdmin/State/${state}/City/${city}/${selectedUserId}`] = selectedUserEmail;
//       }
//     });
//     Object.keys(permissions.businessNames).forEach(business => {
//       updates[`/Admin/Role/StateAdmin/BusinessName/${business}/${selectedUserId}`] = selectedUserEmail;
//     });
//     Object.keys(permissions.industryTypes).forEach(vertical => {
//       updates[`/Admin/Role/StateAdmin/IndustryType/${vertical}/${selectedUserId}`] = selectedUserEmail;
//     });
//     const newClientAssignments = {}; // We will recalculate all assignments from scratch

//   // Check if any permissions are set for each category
//   const hasCityPerms = Object.keys(permissions.cities).length > 0;
//   const hasBusinessPerms = Object.keys(permissions.businessNames).length > 0;
//   const hasVerticalPerms = Object.keys(permissions.industryTypes).length > 0;

//   clients.forEach(client => {
//     // For each category, determine if the client meets the criteria.
//     // If no permissions are set for a category, it's considered a match (we don't filter by it).
//     const cityCriteriaMet = !hasCityPerms || permissions.cities[client.city];
//     const businessCriteriaMet = !hasBusinessPerms || permissions.businessNames[client.businessName];
//     const verticalCriteriaMet = !hasVerticalPerms || permissions.industryTypes[client.industryType];

//     // The final decision: all criteria must be met
//     if (cityCriteriaMet && businessCriteriaMet && verticalCriteriaMet) {
//       newClientAssignments[client.id] = true;
//     }
//   });

//   // Overwrite the user's entire client list with the newly calculated one.
//   // This automatically adds correct clients and removes incorrect ones.
//   updates[`/User/${selectedUserId}`] = newClientAssignments;
//   // --- END: CORRECTED CLIENT ASSIGNMENT LOGIC ---

//   if (Object.keys(updates).length === 0) return alert("No permissions to assign.");
  
//   update(ref(database), updates)
//     .then(() => {
//       alert("Permissions saved and user data updated successfully!");
//       // Resetting state after save is good practice
//       setPermissions({ states: {}, cities: {}, businessNames: {}, industryTypes: {} });
//     })
//     .catch(err => alert("Error saving permissions: " + err.message));
// };

// Replace your existing savePermissions function with this one
const savePermissions = () => {
    if (!selectedUserId) return alert("Please select an employee first.");

    const updates = {};

    // Helper function to compare the "before" and "after" states
    const getChanges = (initial, current) => {
        const toAdd = {};
        const toRemove = {};
        const currentKeys = new Set(Object.keys(current));
        const initialKeys = new Set(Object.keys(initial));

        currentKeys.forEach(key => { if (!initialKeys.has(key)) toAdd[key] = true; });
        initialKeys.forEach(key => { if (!currentKeys.has(key)) toRemove[key] = true; });
        
        return { toAdd, toRemove };
    };

    // Calculate the differences for each permission type
    const cityChanges = getChanges(initialPermissions.cities, permissions.cities);
    const businessChanges = getChanges(initialPermissions.businessNames, permissions.businessNames);
    const verticalChanges = getChanges(initialPermissions.industryTypes, permissions.industryTypes);

    // --- Generate updates for ADDING permissions ---
    Object.keys(cityChanges.toAdd).forEach(city => {
        const state = Object.keys(statesOptions).find(s => statesOptions[s]?.[city]);
        if (state) updates[`/Admin/Role/StateAdmin/State/${state}/City/${city}/${selectedUserId}`] = selectedUserEmail;
    });
    Object.keys(businessChanges.toAdd).forEach(business => {
        updates[`/Admin/Role/StateAdmin/BusinessName/${business}/${selectedUserId}`] = selectedUserEmail;
    });
    Object.keys(verticalChanges.toAdd).forEach(vertical => {
        updates[`/Admin/Role/StateAdmin/IndustryType/${vertical}/${selectedUserId}`] = selectedUserEmail;
    });

    // --- Generate updates for REMOVING permissions ---
    // In Firebase, setting a value to 'null' DELETES it from the database
    Object.keys(cityChanges.toRemove).forEach(city => {
        const state = Object.keys(statesOptions).find(s => statesOptions[s]?.[city]);
        if (state) updates[`/Admin/Role/StateAdmin/State/${state}/City/${city}/${selectedUserId}`] = null;
    });
    Object.keys(businessChanges.toRemove).forEach(business => {
        updates[`/Admin/Role/StateAdmin/BusinessName/${business}/${selectedUserId}`] = null;
    });
    Object.keys(verticalChanges.toRemove).forEach(vertical => {
        updates[`/Admin/Role/StateAdmin/IndustryType/${vertical}/${selectedUserId}`] = null;
    });

    // --- Recalculate and Overwrite All Client Assignments ---
    // NEW LOGIC: Clients are only assigned if user has ALL four permission types
    // (state, city, business, AND vertical) and the client matches ALL of them
    const newClientAssignments = {};
    const hasStatePerms = Object.keys(permissions.states).length > 0;
    const hasCityPerms = Object.keys(permissions.cities).length > 0;
    const hasBusinessPerms = Object.keys(permissions.businessNames).length > 0;
    const hasVerticalPerms = Object.keys(permissions.industryTypes).length > 0;
  
    // Only assign clients if user has ALL four permission types defined
    const userHasAllPermissionTypes = hasStatePerms && hasCityPerms && hasBusinessPerms && hasVerticalPerms;
    
    if (userHasAllPermissionTypes) {
        clients.forEach(client => {
            // Client must match ALL four criteria
            const stateCriteriaMet = permissions.states[client.state];
            const cityCriteriaMet = permissions.cities[client.city];
            const businessCriteriaMet = permissions.businessNames[client.businessName];
            const verticalCriteriaMet = permissions.industryTypes[client.industryType];
        
            if (stateCriteriaMet && cityCriteriaMet && businessCriteriaMet && verticalCriteriaMet) {
                newClientAssignments[client.id] = true;
            }
        });
    }
    // If user doesn't have all four permission types, newClientAssignments remains empty
    // This means any existing client assignments will be removed

    // Overwrite the user's client list. If the new list is empty, all access is removed.
    updates[`/User/${selectedUserId}`] = newClientAssignments;
    // --- ✅ END: CORRECTED CLIENT ASSIGNMENT LOGIC ---
    
    if (Object.keys(updates).length === 0) return alert("No changes were made.");
     console.log("Saving updates to Firebase:", updates);
    update(ref(database), updates)
      .then(() => {
        alert("Permissions updated successfully!");
        setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
      })
      .catch(err => alert("Error updating permissions: " + err.message));
};
  const parseCommentDate = (dateString) => {
    if (!dateString) return null;
    if (dateString.includes('_')) {
        const parts = dateString.split(' ')[0].split('_');
        if (parts.length === 3) {
            const formattedString = `${parts[2]}-${parts[1]}-${parts[0]}`;
            return new Date(formattedString);
        }
    }
    return new Date(dateString);
  };

  // Replace your existing handleUserSelect function with this one
const handleUserSelect = (e) => {
    const uid = e.target.value;
    const email = allUsers.find(u => u.uid === uid)?.email || '';
    setSelectedUserId(uid);
    setSelectedUserEmail(email);

    // Reset permissions if no user is selected or roles haven't loaded
    if (!uid || !allRolesData) {
        setPermissions({ states: {}, cities: {}, businessNames: {}, industryTypes: {} });
        setInitialPermissions({ states: {}, cities: {}, businessNames: {}, industryTypes: {} });
        return;
    }

    const existingPerms = { states: {}, cities: {}, businessNames: {}, industryTypes: {} };

    // Check for States and Cities permissions
    const statesData = allRolesData.State || {};
    for (const stateName in statesData) {
        const citiesData = statesData[stateName].City || {};
        for (const cityName in citiesData) {
            if (citiesData[cityName][uid]) { // Check if the user's UID exists here
                existingPerms.states[stateName] = true;
                existingPerms.cities[cityName] = true;
            }
        }
    }
    // Check for Business Names
    const businessData = allRolesData.BusinessName || {};
    for (const businessName in businessData) {
        if (businessData[businessName][uid]) {
            existingPerms.businessNames[businessName] = true;
        }
    }
    // Check for Verticals (IndustryType)
    const verticalData = allRolesData.IndustryType || {};
    for (const verticalName in verticalData) {
        if (verticalData[verticalName][uid]) {
            existingPerms.industryTypes[verticalName] = true;
        }
    }

    // Set both the live state (for editing) and the initial state (for comparison on save)
    setPermissions(existingPerms);
    // Use a deep copy to prevent the initial state from changing during edits
    setInitialPermissions(JSON.parse(JSON.stringify(existingPerms)));
};

  const addPermission = (type, value) => {
    if (!value) return;
    setPermissions(prev => ({ ...prev, [type]: { ...prev[type], [value]: true } }));
    const keyToReset = type === 'businessNames' ? 'businessName' : type === 'industryTypes' ? 'industryType' : type.slice(0, -1);
    setPermSelection(prev => ({...prev, [keyToReset]: ''}));
  };

  const removePermission = (type, value) => {
    const newPermissions = { ...permissions };
    if (newPermissions[type] && newPermissions[type][value]) {
        delete newPermissions[type][value];
    }
    setPermissions(newPermissions);
  };

  const handleStateChange = e => { setSelectedState(e.target.value); setSelectedCity(''); };
  const clearFilters = () => { setSelectedState(''); setSelectedCity(''); setSelectedBusiness(''); };
  
  const openWhatsAppChatForClient = (client, contact) => {
    if (contact && contact.phoneNumber) {
      const message = encodeURIComponent(`Hi ${contact.contactPerson}, this is a message regarding ${client.clientName}.`);
      const fullNumber = `91${contact.phoneNumber}`;
      const whatsappUrl = `https://wa.me/${fullNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert("This client does not have a valid phone number saved.");
    }
  };

  const handleDownload = (dataType, filters = {}) => {
    // --- START: MODIFIED TEMPLATE DOWNLOAD LOGIC ---
    if (dataType === 'admin-headers') {
      // These are the exact headers your upload function expects
      const headers = [
        'Company_Name',
        'Business_Name',
        'Location',
        'State',
        'Country',
        'Vertical_Name',
        'Contact_Person_Name',
        'Designation',
        'Email_Id',
        'Cell_No',
        'Phone_No',
        'Did_No'
      ];
      
      // Create a worksheet with an empty data array and the specified headers
      const worksheet = XLSX.utils.json_to_sheet([], { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Upload Template");
      XLSX.writeFile(workbook, 'client_upload_template.xlsx');
      return;
    }
    // --- END: MODIFIED TEMPLATE DOWNLOAD LOGIC ---

    let dataToExport = [];
    let fileName = 'report.xlsx';

    if (dataType === 'filteredExport') {
        dataToExport = exportFilteredData;
        fileName = 'filtered_user_data.xlsx';
    } else if (dataType === 'all') {
        dataToExport = clients;
        fileName = 'all_clients_export.xlsx';
    } else {
        dataToExport = filteredClients;
        fileName = 'report_view_export.xlsx';
    }
   
    if (dataToExport.length === 0) {
      alert("No data available to download for the current selection.");
      return;
    }

    const dataForExcel = dataToExport.map(client => {
      const contactDetails = client.ContactPersonDetails || {};
      const contactKey = Object.keys(contactDetails).find(key => key !== 'comment');
      const contact = contactKey ? contactDetails[contactKey] : {};
      const commentsNode = contactDetails.comment || {};
      const allComments = Object.values(commentsNode).flatMap(firstLevel => Object.values(firstLevel));
      const latestComment = allComments.length > 0 ? allComments.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))[0] : null;
      
      return {
        'Client Name': client.clientName || 'N/A',
        'Business Name': client.businessName || 'N/A',
        'Vertical': client.industryType || 'N/A',
        'Country': client.country || 'N/A',
        'State': client.state || 'N/A',
        'City': client.city || 'N/A',
        'Contact Person': contact.contactPerson || 'N/A',
        'Contact No': contact.phoneNumber || 'N/A',
        'Designation': contact.designation || 'N/A',
        'Email': contact.emailId || 'N/A',
        'Last Contact Date': latestComment ? new Date(latestComment.createdDate).toLocaleDateString() : 'N/A',
        'Last Contact Time': latestComment ? new Date(latestComment.createdDate).toLocaleTimeString() : 'N/A',
        'Last Discussion': latestComment ? latestComment.commentmsg : 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, fileName);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  // const handleFileChange = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   const existingPhoneNumbers = new Set();
  //   clients.forEach(client => {
  //       if (client.ContactPersonDetails) {
  //           const contact = Object.values(client.ContactPersonDetails)[0];
  //           if (contact && contact.phoneNumber) {
  //               existingPhoneNumbers.add(String(contact.phoneNumber));
  //           }
  //       }
  //   });
    
  //   const reader = new FileReader();
  //   reader.onload = (event) => {
  //     try {
  //       const data = new Uint8Array(event.target.result);
  //       const workbook = XLSX.read(data, { type: 'array' });
  //       const sheetName = workbook.SheetNames[0];
  //       const worksheet = workbook.Sheets[sheetName];
  //       const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //       if (jsonData.length === 0) return alert("The Excel file is empty.");

  //       const newClientsData = jsonData.filter(row => 
  //           row['Cell_No'] && !existingPhoneNumbers.has(String(row['Cell_No']))
  //       );
  //       const duplicateCount = jsonData.length - newClientsData.length;
  //       if (newClientsData.length === 0) {
  //           return alert(`Upload finished. No new clients were added. ${duplicateCount} duplicate(s) found and skipped.`);
  //       }

  //       const updates = {};
  //       const today = new Date();
  //       const yyyy = today.getFullYear();
  //       let mm = String(today.getMonth() + 1).padStart(2, '0');
  //       let dd = String(today.getDate()).padStart(2, '0');
  //       const formattedDate = `${dd}_${mm}_${yyyy}`;

  //       newClientsData.forEach(row => {
  //         const newClientKey = push(ref(database, 'User/ClientDetails')).key;
  //         const newContactKey = push(ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails`)).key;
          
  //         const clientData = {
  //           clientName: row['Company_Name'] || 'N/A',
  //           businessName: row['Business_Name'] || 'N/A',
  //           city: row['Location'] || 'N/A',
  //           state: row['State'] || 'N/A',
  //           country: row['Country'] || 'N/A',
  //           industryType: row['Vertical_Name'] || 'N/A',
  //           ContactPersonDetails: {
  //             [newContactKey]: {
  //               contactPerson: row['Contact_Person_Name'] || 'N/A',
  //               designation: row['Designation'] || 'N/A',
  //               emailId: row['Email_Id'] || null,
  //               phoneNumber: String(row['Cell_No']) || null,
  //               contactPersonNumber: String(row['Phone_No']) || null,
  //               didNumber: String(row['Did_No']) || null,
  //             }
  //           }
  //         };
          
  //         // 1. Add the main client record
  //         updates[`/User/ClientDetails/${newClientKey}`] = clientData;
          
  //         // 2. Add all the necessary index entries
  //         if (clientData.state && clientData.city) {
  //           updates[`/User/State/${clientData.state}/${clientData.city}/${newClientKey}`] = true;
  //         }
  //         if (clientData.businessName) {
  //           updates[`/User/BusinessName/${clientData.businessName}/${newClientKey}`] = true;
  //         }
  //         if (clientData.industryType) {
  //           updates[`/User/IndustryType/${clientData.industryType}/${newClientKey}`] = true;
  //         }
  //         // Adds the date index with both the client and contact key
  //         updates[`/User/Date_Of_Contact/${formattedDate}/${newClientKey}/${newContactKey}`] = true;
  //       });

  //       update(ref(database), updates)
  //         .then(() => {
  //           alert(`Upload complete!\nSuccessfully saved ${newClientsData.length} new clients.\nSkipped ${duplicateCount} duplicate records.`);
  //         })
  //         .catch(err => {
  //           alert("An error occurred while saving the data.");
  //           console.error(err);
  //         });

  //     } catch (error) {
  //       console.error(error);
  //     } finally {
  //       e.target.value = null; // Reset the file input
  //     }
  //   };
  //   reader.readAsArrayBuffer(file);
  // };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const existingPhoneNumbers = new Set();
    clients.forEach(client => {
        if (client.ContactPersonDetails) {
          // --- UPLOAD: Safer way to get contact details ---
          const contactKey = Object.keys(client.ContactPersonDetails).find(key => key !== 'comment');
          const contact = contactKey ? client.ContactPersonDetails[contactKey] : {};
          if (contact && contact.phoneNumber) {
              existingPhoneNumbers.add(String(contact.phoneNumber));
          }
        }
    });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) return alert("The Excel file is empty.");

        // Phone number validation helper - extracts only 10 digit numbers
        const normalizePhoneNumber = (phone) => {
          if (!phone) return null;
          // Convert to string and remove all non-digit characters (removes +, spaces, dashes, etc.)
          const digitsOnly = String(phone).replace(/\D/g, '');
          // If the number has more than 10 digits and starts with country code (like 91 for India), extract last 10 digits
          if (digitsOnly.length > 10) {
            return digitsOnly.slice(-10);
          }
          // If exactly 10 digits, return as is
          if (digitsOnly.length === 10) {
            return digitsOnly;
          }
          // If less than 10 digits, it's invalid
          return null;
        };

        // Filter and validate phone numbers
        const validatedData = [];
        const invalidPhoneRecords = [];
        
        jsonData.forEach(row => {
          const normalizedPhone = normalizePhoneNumber(row['Cell_No']);
          if (normalizedPhone) {
            validatedData.push({ ...row, 'Cell_No': normalizedPhone });
          } else if (row['Cell_No']) {
            invalidPhoneRecords.push({
              company: row['Company_Name'] || 'Unknown',
              originalPhone: row['Cell_No']
            });
          }
        });

        // Show warning for invalid phone numbers
        if (invalidPhoneRecords.length > 0) {
          const invalidList = invalidPhoneRecords.slice(0, 5).map(r => 
            `${r.company}: ${r.originalPhone}`
          ).join('\n');
          const moreText = invalidPhoneRecords.length > 5 ? `\n...and ${invalidPhoneRecords.length - 5} more` : '';
          alert(`Warning: ${invalidPhoneRecords.length} record(s) have invalid phone numbers (not 10 digits) and will be skipped:\n\n${invalidList}${moreText}`);
        }

        const newClientsData = validatedData.filter(row => 
            row['Cell_No'] && !existingPhoneNumbers.has(String(row['Cell_No']))
        );
        const duplicateCount = validatedData.length - newClientsData.length;
        if (newClientsData.length === 0) {
            return alert(`Upload finished. No new clients were added.\n${duplicateCount} duplicate(s) found and skipped.\n${invalidPhoneRecords.length} record(s) with invalid phone numbers skipped.`);
        }

        // --- UPLOAD: Build the permission map for all users ---
        const allUserPermissions = {};
        if (allRolesData) { // Ensure role data is loaded
          const statesData = allRolesData.State || {};
          const businessData = allRolesData.BusinessName || {};
          const verticalData = allRolesData.IndustryType || {};

          for (const user of allUsers) {
            const uid = user.uid;
            const userPerms = { states: {}, cities: {}, businessNames: {}, industryTypes: {} };

            // Populate States and Cities
            for (const stateName in statesData) {
              const citiesData = statesData[stateName].City || {};
              for (const cityName in citiesData) {
                if (citiesData[cityName][uid]) {
                  userPerms.states[stateName] = true;
                  userPerms.cities[cityName] = true;
                }
              }
            }
            // Populate Business Names
            for (const businessName in businessData) {
              if (businessData[businessName][uid]) {
                userPerms.businessNames[businessName] = true;
              }
            }
            // Populate Verticals
            for (const verticalName in verticalData) {
              if (verticalData[verticalName][uid]) {
                userPerms.industryTypes[verticalName] = true;
              }
            }
            allUserPermissions[uid] = userPerms;
          }
        }
        // --- END: Permission map build ---

        const updates = {};
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${dd}_${mm}_${yyyy}`;

        let assignedClientsCount = 0; // To track assignments

        newClientsData.forEach(row => {
          const newClientKey = push(ref(database, 'User/ClientDetails')).key;
          const newContactKey = push(ref(database, `User/ClientDetails/${newClientKey}/ContactPersonDetails`)).key;
          
          const clientData = {
            clientName: row['Company_Name'] || 'N/A',
            businessName: row['Business_Name'] || 'N/A',
            city: row['Location'] || 'N/A',
            state: row['State'] || 'N/A',
            country: row['Country'] || 'N/A',
            industryType: row['Vertical_Name'] || 'N/A',
            createdDate: formattedDate, // --- UPLOAD: Added createdDate ---
            ContactPersonDetails: {
              [newContactKey]: {
                contactPerson: row['Contact_Person_Name'] || 'N/A',
                designation: row['Designation'] || 'N/A',
                emailId: row['Email_Id'] || null,
                phoneNumber: String(row['Cell_No']) || null,
                contactPersonNumber: String(row['Phone_No']) || null,
                didNumber: String(row['Did_No']) || null,
              }
            }
          };
          
          // 1. Add the main client record
          updates[`/User/ClientDetails/${newClientKey}`] = clientData;
          
          // 2. Add all the necessary index entries
          if (clientData.state && clientData.city) {
            updates[`/User/State/${clientData.state}/${clientData.city}/${newClientKey}`] = true;
          }
          if (clientData.businessName) {
            updates[`/User/BusinessName/${clientData.businessName}/${newClientKey}`] = true;
          }
          if (clientData.industryType) {
            updates[`/User/IndustryType/${clientData.industryType}/${newClientKey}`] = true;
          }
          updates[`/User/Date_Of_Contact/${formattedDate}/${newClientKey}/${newContactKey}`] = true;

          // --- UPLOAD: Check permissions and assign client to users ---
          // NEW LOGIC: Data should ONLY be assigned if user has ALL required permissions
          // (state, city, business, AND vertical) and the client matches ALL of them
          const newClient = clientData; 
          for (const userId in allUserPermissions) {
            const userPerms = allUserPermissions[userId];
            
            // Check if user has permissions set for each category
            const hasCityPerms = Object.keys(userPerms.cities).length > 0;
            const hasStatePerms = Object.keys(userPerms.states).length > 0;
            const hasBusinessPerms = Object.keys(userPerms.businessNames).length > 0;
            const hasVerticalPerms = Object.keys(userPerms.industryTypes).length > 0;

            // User must have ALL four permission types set to be assigned clients
            const userHasAllPermissionTypes = hasStatePerms && hasCityPerms && hasBusinessPerms && hasVerticalPerms;
            
            if (!userHasAllPermissionTypes) {
              // Skip this user if they don't have all four permission types defined
              continue;
            }

            // Check if client matches ALL criteria
            const stateCriteriaMet = userPerms.states[newClient.state];
            const cityCriteriaMet = userPerms.cities[newClient.city];
            const businessCriteriaMet = userPerms.businessNames[newClient.businessName];
            const verticalCriteriaMet = userPerms.industryTypes[newClient.industryType];

            // If ALL four criteria are met, assign the client
            if (stateCriteriaMet && cityCriteriaMet && businessCriteriaMet && verticalCriteriaMet) {
              updates[`/User/${userId}/${newClientKey}`] = true;
              assignedClientsCount++;
            }
          }
          // --- END: Permission check ---
        });

        update(ref(database), updates)
          .then(() => {
            // --- UPLOAD: Updated success message ---
            alert(`Upload complete!\nSuccessfully saved ${newClientsData.length} new clients.\nSkipped ${duplicateCount} duplicate records.\nAutomatically assigned new clients ${assignedClientsCount} times across all users.`);
          })
          .catch(err => {
            alert("An error occurred while saving the data.");
            console.error(err);
          });

      } catch (error) {
        console.error(error);
      } finally {
        e.target.value = null; // Reset the file input
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderAbbreviationTooltip = (abbreviation, fullText) => {
    return (
      <div className="position-absolute bg-dark text-white px-2 py-1 rounded shadow-sm" 
           style={{ 
             zIndex: 1000, 
             fontSize: '0.8rem',
             top: '-35px',
             left: '50%',
             transform: 'translateX(-50%)',
             whiteSpace: 'nowrap'
           }}>
        {abbreviation} - {fullText}
        <div className="position-absolute" 
             style={{
               top: '100%',
               left: '50%',
               transform: 'translateX(-50%)',
               width: 0,
               height: 0,
               borderLeft: '5px solid transparent',
               borderRight: '5px solid transparent',
               borderTop: '5px solid #000'
             }}>
        </div>
      </div>
    );
  };

  const exportUserOptions = useMemo(() => {
    if (!exportFilters.state && !exportFilters.city) {
      return [{ value: 'all', label: 'All Users' }, ...allUsers.map(user => ({ value: user.uid, label: user.email }))];
    }

    const relevantClients = clients.filter(client => {
      const stateMatch = !exportFilters.state || client.state === exportFilters.state;
      const cityMatch = !exportFilters.city || client.city === exportFilters.city;
      return stateMatch && cityMatch;
    });

    const relevantClientIds = new Set(relevantClients.map(c => c.id));
    const relevantUserIds = new Set();

    allUsers.forEach(user => {
      const userClientIds = user.clientIds || [];
      for (const clientId of userClientIds) {
        if (relevantClientIds.has(clientId)) {
          relevantUserIds.add(user.uid);
          break; 
        }
      }
    });

    const filteredUsers = allUsers.filter(user => relevantUserIds.has(user.uid));
    return [{ value: 'all', label: 'All Users' }, ...filteredUsers.map(user => ({ value: user.uid, label: user.email }))];
  }, [exportFilters.state, exportFilters.city, allUsers, clients]);

  useEffect(() => {
    if (activeSection !== 'export') {
      setExportFilteredData([]);
      return;
    }

    let dataToFilter = clients;

    if (exportFilters.user && exportFilters.user !== 'all') {
      const user = allUsers.find(u => u.uid === exportFilters.user);
      const assignedClientIds = new Set(user?.clientIds || []);
      dataToFilter = clients.filter(client => assignedClientIds.has(client.id));
    }
    
    if (exportFilters.state) {
      dataToFilter = dataToFilter.filter(client => client.state === exportFilters.state);
    }
    if (exportFilters.city) {
      dataToFilter = dataToFilter.filter(client => client.city === exportFilters.city);
    }

    setExportFilteredData(dataToFilter);

  }, [exportFilters, clients, allUsers, activeSection]);

  useEffect(() => {
    const fetchAllUserClientIds = async () => {
        const usersWithClients = await Promise.all(allUsers.map(async (user) => {
            const userClientsRef = ref(database, `User/${user.uid}`);
            const snapshot = await get(userClientsRef);
            const clientIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
            return { ...user, clientIds };
        }));
        setAllUsers(usersWithClients);
    };

    if (usersLoaded && clientsLoaded) {
        fetchAllUserClientIds();
    }
  }, [usersLoaded, clientsLoaded]); // Reruns when initial user list is loaded
  useEffect(() => {
  // Generate unique list of users who have discussed
  const discussedUsers = new Set();
  
  clients.forEach(client => {
    const details = client.ContactPersonDetails || {};
    const commentsNode = details.comment || {};
    const allComments = Object.values(commentsNode).flatMap(Object.values);
    
    allComments.forEach(comment => {
      if (comment.writtenBy) {
        const username = comment.writtenBy.split('@')[0];
        discussedUsers.add(username);
      }
    });
  });
  
  setDiscussedByOptions(Array.from(discussedUsers).sort());
}, [clients]);

  useEffect(() => {
    if (activeSection !== 'export') {
      setExportFilteredData([]);
      return;
    }
    let filteredClients = clients;

  // 2. Apply the State filter if a state is selected
  if (selectedState !== 'All') {
    filteredClients = filteredClients.filter(
      client => client.STATE === selectedState
    );
  }

  // 3. Apply the City filter ON THE ALREADY FILTERED LIST
  if (selectedCity !== 'All') {
    filteredClients = filteredClients.filter(
      client => client.CITY === selectedCity
    );
  }
  
  // 4. Finally, apply the "Discussed By" filter ON THE RESULT OF THE PREVIOUS FILTERS
  if (selectedDiscussedBy !== 'All') {
    filteredClients = filteredClients.filter(client => {
      const details = client.ContactPersonDetails || {};
      const commentsNode = details.comment || {};
      const allComments = Object.values(commentsNode).flatMap(Object.values);

      return allComments.some(comment => 
        comment.writtenBy && comment.writtenBy.split('@')[0] === selectedDiscussedBy
      );
    });
  }


    // This block is now corrected to fetch assigned user data from the correct Firebase path
    if (exportFilters.user) {
      if (exportFilters.user === 'all') {
        setExportFilteredData(clients);
      } else {
        // Fetch the list of client IDs assigned to the selected user
        const userClientListRef = ref(database, `User/${exportFilters.user}`);
        onValue(userClientListRef, (snapshot) => {
          const assignedClientIds = snapshot.val() ? Object.keys(snapshot.val()) : [];
          const userClients = clients.filter(client => assignedClientIds.includes(client.id));
          setExportFilteredData(userClients);
        }, { onlyOnce: true }); // Fetch the data once
      }
    } else {
      setExportFilteredData([]);
    }
  }, [exportFilters.user, clients, activeSection]);

  // useEffect(() => {
  //   function handleClickOutside(event) {
  //     if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
  //       setIsExportDropdownOpen(false);
  //     }
  //   }
  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, [exportDropdownRef]);

  // Add these state variables at the top with your other useState declarations
const [dropdownStates, setDropdownStates] = useState({
  states: false,
  cities: false,
  businessNames: false,
  industryTypes: false
});

  // Add this function to toggle dropdowns
  const toggleDropdown = (type) => {
    setDropdownStates(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Add this useEffect to handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setDropdownStates({
          states: false,
          cities: false,
          businessNames: false,
          industryTypes: false
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) return <div>Loading...</div>;

  const filterCities = selectedState ? Object.keys(statesOptions[selectedState] || {}) : [];
  const assignmentFormCities = permSelection.state ? Object.keys(statesOptions[permSelection.state] || {}) : [];
  const renderTooltip = (comments, type) => {
    if (!comments || comments.length <= 1) return null;
    const previousItems = comments.slice(1);
    return (
      <div className="position-absolute bg-white border rounded-3 shadow-lg p-3" style={{ zIndex: 1050, minWidth: '320px', top: '100%', left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
        <h6 className="border-bottom pb-2 mb-2">Previous {type === 'date' ? 'Dates' : 'Discussions'}</h6>
        {previousItems.map((item, index) => (
          <div key={index} className="mb-2 p-2 rounded" style={{ backgroundColor: '#f8f9fa' }}>
            {type === 'date' ? (
              <div>{new Date(item.createdDate).toLocaleString()} by {item.writtenBy?.split('@')[0]}</div>
            ) : (
              <div>
                <p className="mb-1">"{item.commentmsg}"</p>
                <small className="text-muted">{new Date(item.createdDate).toLocaleString()} by {item.writtenBy?.split('@')[0]}</small>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="container py-4" style={{ minHeight: '100vh' }}>
      {showRefreshToast && (
        <div 
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            backgroundColor: '#198754', // Bootstrap success (green)
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '0.25rem',
            zIndex: 2000, // High z-index to be on top of everything
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <i className="fas fa-check-circle me-2"></i>
          Data refreshed successfully!
        </div>
      )}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="w-75 me-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search Client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="btn-group">
            <button onClick={handleFileUploadClick} className="btn btn-outline-success">
                <i className="fas fa-file-upload me-2"></i>Upload Excel
            </button>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".xlsx"
            />
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-start align-items-center mb-4">
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
  onClick={() => setActiveSection(prev => prev === 'export' ? 'report' : 'export')}
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
        {Object.keys(selectedClients).length > 0 && (
        <button 
            onClick={handleSendEmail} 
            className="btn ms-2 rounded-pill"
            style={{ backgroundColor: '#ffc107', color: 'black' }}
        >
            <i className="fas fa-paper-plane me-2"></i>
            Send Email ({Object.keys(selectedClients).length})
        </button>
    )}
        <button className="btn btn-danger ms-2 rounded-pill" onClick={handleDeleteSelected}
          style={{ backgroundColor: '#dc3545', color: 'white', flexShrink: 0 }}
          disabled={isDeleting || Object.keys(selectedClients).length === 0}>
          {isDeleting ? 'Deleting...' : `Delete selected (${Object.keys(selectedClients).length})`}
        </button>
        {/* --- START: MODIFIED DOWNLOAD BUTTON --- */}
        {activeSection === 'admin' ? (
          <a
            href="/Example.xlsx" // The path to your file in the public folder
            download="client_upload_template.xlsx" // The filename the user will see
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

      {activeSection === 'export' && (
        <div className="card shadow-sm mb-4" style={{ zIndex: 1010 }}>
            <div className="card-body">
                <h5 className="card-title">Filtered Export by User</h5>
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">State</label>
                        <CustomSelect
                            value={exportFilters.state}
                            onChange={(value) => setExportFilters({ ...exportFilters, state: value, city: '', user: '' })}
                            placeholder="Select State"
                            options={[{ value: '', label: 'All States' }, ...Object.keys(statesOptions).map(state => ({ value: state, label: state }))]}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">City</label>
                        <CustomSelect
                            value={exportFilters.city}
                            onChange={(value) => setExportFilters({ ...exportFilters, city: value, user: '' })}
                            placeholder="Select City"
                            options={[{ value: '', label: 'All Cities' }, ...(exportFilters.state ? Object.keys(statesOptions[exportFilters.state] || {}).map(city => ({ value: city, label: city })) : [])]}
                            disabled={!exportFilters.state}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">User</label>
                        <CustomSelect
                            value={exportFilters.user}
                            onChange={(value) => setExportFilters({ ...exportFilters, user: value })}
                            placeholder="Select a User"
                            options={exportUserOptions}
                        />
                    </div>
                </div>
                
                {/* This section now correctly shows the preview and download button */}
                {exportFilters.user && (
                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">
                                Preview for {exportFilters.user === 'all' ? 'Selected Filters' : allUsers.find(u => u.uid === exportFilters.user)?.email}
                            </h6>
                            <button 
                                onClick={() => handleDownload('filteredExport')}
                                className="btn btn-primary"
                                disabled={exportFilteredData.length === 0}
                            >
                                <i className="fas fa-download me-2"></i>
                                Download Preview Data
                            </button>
                        </div>
                        <div className="table-wrapper rounded-3 shadow-sm" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="table table-hover mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="border-0">Client Name</th>
                                        <th className="border-0">Business Name</th>
                                        <th className="border-0">Vertical</th>
                                        <th className="border-0">State</th>
                                        <th className="border-0">City</th>
                                        <th className="border-0">Contact No</th>
                                        <th className="border-0">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exportFilteredData.length > 0 ? (
                                        exportFilteredData.map(client => {
                                            const contact = client.ContactPersonDetails ? Object.values(client.ContactPersonDetails)[0] : {};
                                            return (
                                                <tr key={client.id}>
                                                    <td>{client.clientName || 'N/A'}</td>
                                                    <td>{client.businessName || 'N/A'}</td>
                                                    <td>{client.industryType || 'N/A'}</td>
                                                    <td>{client.state || 'N/A'}</td>
                                                    <td>{client.city || 'N/A'}</td>
                                                    <td>{contact.phoneNumber || 'N/A'}</td>
                                                    <td>{contact.emailId || 'N/A'}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-4">
                                                No data available for this user.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeSection === 'report' && (
        <div className="table-section mb-4">
          {/* This is the single, corrected header div */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Report Data Table</h5>
            
            {/* This wrapper holds both buttons */}
           <div>
            <button 
              className="btn btn-outline-info me-2" 
              onClick={handleRefresh} 
              title="Refresh Data"
              disabled={isRefreshing} 
            >
              {isRefreshing ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="fas fa-sync-alt"></i>
              )}
            </button>
            <button className="btn btn-outline-primary" onClick={() => setShowTable(prev => !prev)}>
                {showTable ? 'Hide Table' : 'Show Table'}
              </button>
            </div>
          </div>
          {showTable && (
            <div 
              ref={tableContainerRef}
              className="table-wrapper rounded-3 shadow-sm"
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >

             <table className="table table-hover mb-0" style={{ width: '100%', fontSize: '0.8rem', tableLayout: 'fixed' }}>
            <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                    <th style={{ width: '2%' }}><input type="checkbox" onChange={(e) => handleSelectAllClients(e.target.checked)} checked={isAllSelected} /></th>
                    <th style={{ width: '3%', textAlign: 'center' }}>
                      <div>Status</div>
                      <select 
                        className="form-select form-select-sm" 
                        value={selectedStatus} 
                        onChange={e => setSelectedStatus(e.target.value)}
                        style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                      >
                        <option value="">All</option>
                        {defaultStatusOptions.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ color: opt.color }}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th style={{ width: '6%' }}><div>Business</div><select className="form-select form-select-sm" value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)}><option value="">All</option>{businessNamesOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                    <th style={{ width: '6%' }}><div>Vertical</div><select className="form-select form-select-sm" value={selectedVertical} onChange={e => setSelectedVertical(e.target.value)}><option value="">All</option>{verticalsOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                    <th style={{ width: '10%' }}>Client Name</th>
                    <th style={{ width: '4%' }}>Country</th>
                    <th style={{ width: '5%' }}><div>State</div><select className="form-select form-select-sm" value={selectedState} onChange={e => {setSelectedState(e.target.value); setSelectedCity('');}}><option value="">All</option>{Object.keys(statesOptions).map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                    <th style={{ width: '5%' }}><div>City</div><select className="form-select form-select-sm" value={selectedCity} onChange={e => setSelectedCity(e.target.value)} disabled={!selectedState}><option value="">All</option>{filterCities.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                    <th style={{ width: '7%' }}>Contact</th>
                    <th style={{ width: '7%' }}>Designation</th>
                    <th style={{ width: '7%' }}>Phone</th>
                    <th style={{ width: '8%' }}>
                      <div>Email</div>
                      <select aria-label="Filter email" className="form-select form-select-sm" value={selectedEmailFilter} onChange={e => setSelectedEmailFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="na">N/A only</option>
                        <option value="actual">Actual emails (exclude N/A)</option>
                      </select>
                    </th>
                    <th style={{ width: '7%' }} className="border-0">
                    {/* This is the new, fixed column name */}
  <div style={{ 
    fontSize: '0.75rem', 
    fontWeight: '600', 
    marginBottom: '4px', 
    color: '#343a40' 
  }}>
    DISCUSSED BY
  </div>
                <select 
  className="form-select form-select-sm" 
  style={{ fontSize: '0.7rem', padding: '2px 4px' }}
  value={selectedDiscussedBy}
  onChange={e => setSelectedDiscussedBy(e.target.value)}
>
  <option value="All">All</option>
  {discussedByOptions.map(user => <option key={user} value={user}>{user}</option>)}
</select>
              </th>
                    <th style={{ width: '8%' }}>
                      <div>Latest Date</div>
                      <input
                        type="date"
                        className="form-control form-control-sm mt-1"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </th>
                    <th style={{ width: '11%' }}>Latest Discussion</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
              
              


                <tbody>
                  {newClientRecord && (
                    <tr className="table-info">
                      <td><i className="fas fa-plus-circle text-primary"></i></td>
                      <td style={{ textAlign: 'center' }}><span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#000', display: 'inline-block' }}></span></td>
                      <td>{abbreviateBusiness(newClientRecord.businessName)}</td>
                      <td>{abbreviateVertical(newClientRecord.industryType)}</td>
                      <td><input type="text" className="form-control form-control-sm" name="clientName" value={newClientRecord.clientName} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Client Name" /></td>
                      <td>{abbreviateCountry(newClientRecord.country)}</td>
                      <td>{abbreviateState(newClientRecord.state)}</td>
                      <td>{newClientRecord.city}</td>
                      <td><input type="text" className="form-control form-control-sm" name="contactPerson" value={newClientRecord.ContactPersonDetails.contactPerson} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Contact" /></td>
                      <td><input type="text" className="form-control form-control-sm" name="designation" value={newClientRecord.ContactPersonDetails.designation} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Designation" /></td>
                      <td><input type="text" className="form-control form-control-sm" name="phoneNumber" value={newClientRecord.ContactPersonDetails.phoneNumber} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Phone" /></td>
                      <td><input type="email" className="form-control form-control-sm" name="emailId" value={newClientRecord.ContactPersonDetails.emailId} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Email" /></td>
                      <td>{getAuth().currentUser.email.split('@')[0]}</td>
                      <td colSpan="3">Press Enter to save...</td>
                    </tr>
                  )}
                  {/* PERFORMANCE OPTIMIZATION: Render only paginated data, not all filtered clients */}
                  {pagination.paginatedData.map(client => {
                    // ADD THIS NEW, CORRECT LOGIC
                   const details = client.ContactPersonDetails || {};

                  // 2. Find the CONTACT PERSON'S details by looking for the unique key
                  let contact = {};
                  const contactKey = Object.keys(details).find(key => key !== 'comment');
                  if (contactKey) {
                  contact = details[contactKey] || {};
                  }

                  // 3. Find the COMMENTS directly from the parent object
                      const commentsNode = details.comment || {};
                      const allComments = Object.values(commentsNode).flatMap(Object.values).sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
                      const latestComment = allComments.length > 0 ? allComments[0] : null;
                    return (
                     
                        <tr key={client.id} className={selectedClients[client.id] ? 'selected-row' : ''}>
                          <td><input type="checkbox" className="form-check-input" checked={!!selectedClients[client.id]} onChange={() => handleSelectClient(client)} /></td>
                          
                          {/* Status Column */}
                          <td style={{ padding: '4px', position: 'relative', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div 
                              className="work-status-indicator"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStatusDropdown(activeStatusDropdown === client.id ? null : client.id);
                              }}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: getStatusColor(client),
                                margin: '0 auto',
                                cursor: 'pointer',
                                border: '2px solid #fff',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                              title={`Click to change status (Current: ${getStatusLabel(client)})`}
                            />
                            {activeStatusDropdown === client.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  backgroundColor: '#fff',
                                  border: '1px solid #ddd',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 1000,
                                  padding: '8px',
                                  minWidth: '130px'
                                }}
                              >
                                {workStatusOptions.map(option => (
                                  <div
                                    key={option.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateWorkStatus(client.id, option.value);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      borderRadius: '4px',
                                      marginBottom: '4px',
                                      backgroundColor: getStatusValue(client) === option.value ? '#e3f2fd' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = getStatusValue(client) === option.value ? '#e3f2fd' : 'transparent'}
                                  >
                                    <span style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '50%',
                                      backgroundColor: option.color,
                                      marginRight: '8px',
                                      border: getStatusValue(client) === option.value ? '2px solid #0d6efd' : '1px solid #ccc'
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: getStatusValue(client) === option.value ? '600' : 'normal' }}>{option.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'business' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'help' }}>
                            {abbreviateBusiness(client.businessName)}
                            {hoveredCell.row === client.id && hoveredCell.column === 'business' && renderAbbreviationTooltip(abbreviateBusiness(client.businessName), client.businessName)}
                          </td>
                          <td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'vertical' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'help' }}>
                            {abbreviateVertical(client.industryType)}
                            {hoveredCell.row === client.id && hoveredCell.column === 'vertical' && renderAbbreviationTooltip(abbreviateVertical(client.industryType), client.industryType)}
                          </td>
                          <td onDoubleClick={() => handleEditClick(client.id, 'clientName')}>
                              {editingClientId === client.id && editingField === 'clientName' ? (
                                  <input type="text" name="clientName" className="form-control form-control-sm" value={editFormData.clientName} onChange={handleEditFormChange} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(client.id); if (e.key === 'Escape') handleCancelClick(); }} onBlur={() => handleSaveClick(client.id)} autoFocus />
                              ) : ( client.clientName || 'N/A' )}
                          </td>
                          <td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'country' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'help' }}>
                            {abbreviateCountry(client.country)}
                            {hoveredCell.row === client.id && hoveredCell.column === 'country' && renderAbbreviationTooltip(abbreviateCountry(client.country), client.country)}
                          </td>
                          <td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'state' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'help' }}>
                            {abbreviateState(client.state)}
                            {hoveredCell.row === client.id && hoveredCell.column === 'state' && renderAbbreviationTooltip(abbreviateState(client.state), client.state)}
                          </td>
                          <td>{client.city || 'N/A'}</td>
                          <td onDoubleClick={() => handleEditClick(client.id, 'contactPerson')}>
                              {editingClientId === client.id && editingField === 'contactPerson' ? (
                                  <input type="text" name="contactPerson" className="form-control form-control-sm" value={editFormData.contactPerson} onChange={handleEditFormChange} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(client.id); if (e.key === 'Escape') handleCancelClick(); }} onBlur={() => handleSaveClick(client.id)} autoFocus />
                              ) : ( contact.contactPerson || 'N/A' )}
                          </td>
                          <td onDoubleClick={() => handleEditClick(client.id, 'designation')}>
                              {editingClientId === client.id && editingField === 'designation' ? (
                                  <input type="text" name="designation" className="form-control form-control-sm" value={editFormData.designation} onChange={handleEditFormChange} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(client.id); if (e.key === 'Escape') handleCancelClick(); }} onBlur={() => handleSaveClick(client.id)} autoFocus />
                              ) : ( contact.designation || 'N/A' )}
                          </td>
                          <td onDoubleClick={() => handleEditClick(client.id, 'phoneNumber')}>
                              {editingClientId === client.id && editingField === 'phoneNumber' ? (
                                  <input type="text" name="phoneNumber" className="form-control form-control-sm" value={editFormData.phoneNumber} onChange={handleEditFormChange} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(client.id); if (e.key === 'Escape') handleCancelClick(); }} onBlur={() => handleSaveClick(client.id)} autoFocus />
                              ) : ( contact.phoneNumber || 'N/A' )}
                          </td>
                          
                          
                          {/* --- CORRECTED SECTION STARTS HERE --- */}
                         <td onDoubleClick={() => handleEditClick(client.id, 'emailId')}>
  {editingClientId === client.id && editingField === 'emailId' ? (
    <input type="text" name="emailId" className="form-control form-control-sm" value={editFormData.emailId} onChange={handleEditFormChange} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick(client.id); if (e.key === 'Escape') handleCancelClick(); }} onBlur={() => handleSaveClick(client.id)} autoFocus />
  ) : ( contact.emailId || 'N/A' )}
</td>
{/* NEW DISCUSSED BY COLUMN */}
<td>{latestComment ? latestComment.writtenBy?.split('@')[0] || 'N/A' : 'N/A'}</td>
{/* --- CORRECTED SECTION STARTS HERE --- */}
<td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'date' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'pointer' }}>
                            {latestComment ? (
                              <div>
                                <div>{new Date(latestComment.createdDate).toLocaleDateString()}</div>
                                {allComments.length > 1 && <small className="text-primary">+{allComments.length - 1} more</small>}
                              </div>
                            ) : 'No dates'}
                            {hoveredCell.row === client.id && hoveredCell.column === 'date' && renderTooltip(allComments, 'date')}
                          </td>
                          <td onMouseEnter={() => setHoveredCell({ row: client.id, column: 'discussion' })} onMouseLeave={() => setHoveredCell({ row: null, column: null })} style={{ position: 'relative', cursor: 'pointer' }}>
                            {latestComment ? (
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <div>{latestComment.commentmsg}</div>
                                {allComments.length > 1 && <small className="text-primary">+{allComments.length - 1} more</small>}
                              </div>
                            ) : 'No discussions'}
                            {hoveredCell.row === client.id && hoveredCell.column === 'discussion' && renderTooltip(allComments, 'discussion')}
                          </td>
                          <td className="text-center">
                            <div className="btn-group">
                              <button className="btn btn-sm btn-light" onClick={() => handleOpenModal('addComment', client)} title="Add Comment"><i className="fas fa-comment text-info"></i></button>
                              <button className="btn btn-sm btn-light" onClick={() => handleAddClientFromTemplate(client)} title="Add New Client using this as a Template">
                                <i className="fas fa-plus-square text-success"></i>
                              </button>
                              <button className="btn btn-sm btn-light" onClick={() => handleOpenModal('setMeeting', client)} title="Set Meeting"><i className="fas fa-calendar-alt text-primary"></i></button>
                              <button className="btn btn-sm btn-success" onClick={() => openWhatsAppChatForClient(client, contact)} title="WhatsApp"><i className="fab fa-whatsapp text-white"></i></button>
                            </div>
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
            
          {/* PERFORMANCE OPTIMIZATION: Pagination Component */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
            hasNextPage={pagination.hasNextPage}
            hasPreviousPage={pagination.hasPreviousPage}
            onFirstPage={pagination.goToFirstPage}
            onLastPage={pagination.goToLastPage}
            onNextPage={pagination.goToNextPage}
            onPreviousPage={pagination.goToPreviousPage}
          />
        </div>
      )}

      {activeSection === 'admin' && (
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="card-title mb-4">User Permission Management</h4>
            
            {/* User Selection */}
            <div className="mb-4" style={{ minWidth: '300px' }}>
              <label className="form-label text-muted mb-2">Select User</label>
              <CustomSelect
                value={selectedUserId}
                onChange={(value) => handleUserSelect({ target: { value } })}
                placeholder="Choose an employee..."
                options={allUsers
                  .filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(u => ({ value: u.uid, label: u.email }))
                }
              />
            </div>

            {selectedUserId && (
              <div className="selected-user-container">
                {/* Permission Selection Form */}
                <div className="row g-4">
                  {/* State Selection */}
                  <div className="col-md-6 col-lg-3">
                    <MultiSelectDropdown
                      label="States"
                      options={Object.keys(statesOptions)}
                      selectedValues={permissions.states}
                      onAdd={(value) => addPermission('states', value)}
                      onRemove={(value) => removePermission('states', value)}
                      placeholder="Select States"
                    />
                  </div>

                  {/* City Selection */}
                  <div className="col-md-6 col-lg-3">
                    <MultiSelectDropdown
                      label="Cities"
                      options={Object.keys(permissions.states).flatMap(state => 
                        Object.keys(statesOptions[state] || {})
                      )}
                      selectedValues={permissions.cities}
                      onAdd={(value) => addPermission('cities', value)}
                      onRemove={(value) => removePermission('cities', value)}
                      placeholder="Select Cities"
                      disabled={Object.keys(permissions.states).length === 0}
                    />
                  </div>

                  {/* Business Selection */}
                  <div className="col-md-6 col-lg-3">
                    <MultiSelectDropdown
                      label="Business Names"
                      options={businessNamesOptions}
                      selectedValues={permissions.businessNames}
                      onAdd={(value) => addPermission('businessNames', value)}
                      onRemove={(value) => removePermission('businessNames', value)}
                      placeholder="Select Businesses"
                    />
                  </div>

                  {/* Vertical Selection */}
                  <div className="col-md-6 col-lg-3">
                    <MultiSelectDropdown
                      label="Verticals"
                      options={verticalsOptions}
                      selectedValues={permissions.industryTypes}
                      onAdd={(value) => addPermission('industryTypes', value)}
                      onRemove={(value) => removePermission('industryTypes', value)}
                      placeholder="Select Verticals"
                    />
                  </div>
                </div>

                {/* Selected Permissions Display */}
                <div className="mt-4 selected-permissions-container">
                  <h5 className="mb-3">
                    <i className="fas fa-shield-alt me-2"></i>
                    Permissions for {selectedUserEmail}
                  </h5>
                  
                  <div className="row g-3">
                    {Object.entries(permissions).map(([type, values]) => (
                      <div key={type} className="col-md-6 col-lg-3">
                        <div className="permission-category card h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">{type.replace(/([A-Z])/g, ' $1').trim()}</h6>
                          </div>
                          <div className="card-body">
                            <div className="permission-tags">
                              {Object.keys(values).length > 0 ? (
                                Object.keys(values).map(value => (
                                  <span key={value} className="badge bg-primary me-2 mb-2 d-inline-flex align-items-center">
                                    {value}   
                                    <button 
                                      className="btn btn-sm ms-1 p-0"
                                      onClick={() => removePermission(type, value)}
                                      style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: 'white', 
                                        fontSize: '1rem',
                                        lineHeight: 1,
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                      }}
                                      title="Remove permission"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted">No permissions set</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="mt-4 text-end">
                    <button 
                      onClick={savePermissions} 
                      className="btn btn-primary btn-lg"
                    >
                      <i className="fas fa-save me-2"></i>
                      Save All Permissions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals Section */}
      <Modal isOpen={modalState.type === 'addComment'} onClose={handleCloseModal} title={`Add Comment for ${modalState.client?.clientName}`}>
        <div className="modal-form">
            <div className="form-info-row">
                <span>Date:</span>
                <strong>{new Date().toLocaleDateString()}</strong>
            </div>
            <div className="form-info-row">
                <span>Written By:</span>
                <strong>{getAuth().currentUser ? getAuth().currentUser.email : ''}</strong>
            </div>
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Type your comment here..." rows="5"></textarea>
            <button onClick={handleAddComment}>Save Comment</button>
        </div>
      </Modal>

      <Modal isOpen={modalState.type === 'setMeeting'} onClose={handleCloseModal} title={`Set Meeting for ${modalState.client?.clientName}`}>
        <div className="modal-form">
            <input type="date" value={meetingDetails.date} onChange={e => setMeetingDetails({...meetingDetails, date: e.target.value})} />
            <input type="time" value={meetingDetails.time} onChange={e => setMeetingDetails({...meetingDetails, time: e.target.value})} />
            <textarea placeholder="Discussion..." value={meetingDetails.topic} onChange={(e) => setMeetingDetails({...meetingDetails, topic: e.target.value})} rows="3"></textarea>
            <button onClick={handleSetMeeting}>Schedule</button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminDashboard;