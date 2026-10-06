import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { database } from './firebaseConfig';
import { ref, onValue, push, set, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import './ClientDashboard.css';
import Modal from './Modal';
import CustomSelect from './CustomSelect';
import * as XLSX from 'xlsx';
import { useParams } from 'react-router-dom';
import { useDebounce, usePagination } from './hooks';
import Pagination from './components/Pagination';

function MyClients() {
  const [assignedClients, setAssignedClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalState, setModalState] = useState({ type: null, client: null });
  const [commentText, setCommentText] = useState('');
  const [concernText, setConcernText] = useState('');
  const [meetingDetails, setMeetingDetails] = useState({ date: '', time: '', topic: '' });
  const [newClientAfterId, setNewClientAfterId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Options for filters
  const [statesOptions, setStatesOptions] = useState({});
  const [businessNamesOptions, setBusinessNamesOptions] = useState([]);
  const [verticalsOptions, setVerticalsOptions] = useState([]);
  
  // Show/Hide table
  const [showTable, setShowTable] = useState(true);
  
  // Selected clients for bulk actions
  const [selectedClients, setSelectedClients] = useState({});

  // Hover states for tooltips
  const [hoveredCell, setHoveredCell] = useState({ row: null, column: null });

  // State for work status dropdown
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);

  // State for color picker
  const [colorPickerStatus, setColorPickerStatus] = useState(null);

  // Default work status options with colors
  const defaultStatusOptions = [
    { value: 'no-call', label: 'No Call', color: '#000000' },
    { value: 'do-not-call', label: 'Do Not Call Again', color: '#dc3545' },
    { value: 'call-tomorrow', label: 'Call Tomorrow', color: '#ff8c00' },
    { value: 'follow-up', label: 'Follow Up', color: '#ffc107' },
    { value: 'lead', label: 'Lead', color: '#28a745' },
    { value: 'concern-person', label: 'Concern Person', color: '#007bff' }
  ];

  // Work status options with customizable colors (loaded from Firebase or localStorage)
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

  // Handle color change for status
  const handleStatusColorChange = (statusValue, newColor) => {
    const updatedOptions = workStatusOptions.map(opt => 
      opt.value === statusValue ? { ...opt, color: newColor } : opt
    );
    setWorkStatusOptions(updatedOptions);
    
    // Save to localStorage
    const colorMap = {};
    updatedOptions.forEach(opt => {
      colorMap[opt.value] = opt.color;
    });
    localStorage.setItem('workStatusColors', JSON.stringify(colorMap));

    // Also save to Firebase for persistence across devices
    const user = getAuth().currentUser;
    if (user) {
      const colorRef = ref(database, `Admin/StatusColors`);
      set(colorRef, colorMap).catch(err => console.error("Error saving colors:", err));
    }
  };

  // State to manage the inline new client record
  const [newClientRecord, setNewClientRecord] = useState(null);
  const { uid } = useParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableContainerRef = useRef(null);
  const skipPaginationResetRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);

  // PERFORMANCE OPTIMIZATION: Debounce search term to prevent excessive filtering on large datasets
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // PERFORMANCE OPTIMIZATION: Pagination for large datasets
  const pagination = usePagination(filteredClients, 100);

  // Check if all visible clients are selected (only check current page for performance)
  const isAllSelected = useMemo(() => {
    return pagination.paginatedData.length > 0 && pagination.paginatedData.every(client => selectedClients[client.id]);
  }, [pagination.paginatedData, selectedClients]);



  const handleAddClientFromTemplate = (client) => {
    setNewClientRecord({
      businessName: client.businessName,
      industryType: client.industryType,
      country: client.country,
      state: client.state,
      city: client.city,
      clientName: client.clientName, // Field is cleared for new client
      ContactPersonDetails: {
        contactPerson: '', // Field is cleared for new client
        designation: '',   // Field is cleared for new client
        phoneNumber: '',   // Field is cleared for new client
        emailId: ''        // Field is cleared for new client
      }
    });
    // Tell the component WHERE to show the new row
    setNewClientAfterId(client.id); 
  };

  const handleRefresh = () => {
  const container = tableContainerRef.current;
  if (container) {
    // Use a unique session storage key for this page
    sessionStorage.setItem('clientManualScrollPos', container.scrollTop);
  }
  sessionStorage.setItem('didClientManualRefresh', 'true'); // Unique flag for this page
    setIsRefreshing(true);
  // Trigger the data fetching useEffect
  setRefreshTrigger(prev => prev + 1);
};
  // Handler for input changes in the new client row
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

  // Handler to save the new client when Enter is pressed
  const handleSaveNewClient = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const { clientName, ContactPersonDetails } = newClientRecord;
      const { contactPerson, phoneNumber } = ContactPersonDetails; 
      if (!clientName || !ContactPersonDetails.contactPerson) {
        return alert("Please fill at least the Client Name and Contact Person.");
      }
      if (phoneNumber && phoneNumber.trim() !== '') {
        const trimmedPhoneNumber = phoneNumber.trim();
        
        const phoneExists = assignedClients.some(client => {
          const details = client.ContactPersonDetails || {};
          // Get all contact keys, excluding the 'comment' key
          const contactKeys = Object.keys(details).filter(key => key !== 'comment');

          // Check if any of the contacts for this client have the same phone number
          return contactKeys.some(key => {
            const contact = details[key];
            return contact && String(contact.phoneNumber).trim() === trimmedPhoneNumber;
          });
        });

        if (phoneExists) {
          return alert("A client with this phone number already exists!");
        }
      }
      try {
        setIsLoading(true);
        const user = getAuth().currentUser;
        if (!user) {
          setIsLoading(false);
          return alert("You must be logged in to add a client.");
        }

        const dbRef = ref(database);
        const newClientRef = push(ref(database, 'User/ClientDetails'));
        const newClientId = newClientRef.key;
        
        const newContactKey = push(ref(database, `User/ClientDetails/${newClientId}/ContactPersonDetails`)).key;
        const clientToSave = {
            ...newClientRecord,
            id: newClientId,
            ContactPersonDetails: {
                [newContactKey]: newClientRecord.ContactPersonDetails
            }
        };

        const updates = {};
        updates[`/User/ClientDetails/${newClientId}`] = clientToSave;
        updates[`/User/${user.uid}/${newClientId}`] = true;

        await update(dbRef, updates);

        setAssignedClients(prev => [clientToSave, ...prev]);
        // Reset both states to hide the inline form
        setNewClientRecord(null);
        setNewClientAfterId(null); 
        alert("New client saved and assigned to you!");
      } catch (error) {
        alert("Failed to save new client: " + error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Helper functions for abbreviations
  const abbreviateText = (text, maxLength = 2) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength + 1) return text;
    return text.substring(0, maxLength).toUpperCase();
  };

  const abbreviateBusiness = (business) => {
    if (!business) return 'N/A';
    const abbreviations = {
      'epjobs': 'EP',
      'softek': 'ST',
      'education': 'EDU',
      'technology': 'TECH',
      'healthcare': 'HEALTH',
      'finance': 'FIN',
      'retail': 'RET',
      'manufacturing': 'MFG'
    };
    return abbreviations[business.toLowerCase()] || abbreviateText(business, 3);
  };

  const abbreviateVertical = (vertical) => {
    if (!vertical) return 'N/A';
    const abbreviations = {
      'information technology': 'IT',
      'information': 'INFO',
      'healthcare': 'HEALTH',
      'education': 'EDU',
      'finance': 'FIN',
      'retail': 'RET',
      'manufacturing': 'MFG'
    };
    return abbreviations[vertical.toLowerCase()] || abbreviateText(vertical, 4);
  };

  const abbreviateState = (state) => {
    if (!state) return 'N/A';
    const stateAbbreviations = {
      'maharashtra': 'MH',
      'gujarat': 'GJ',
      'karnataka': 'KA',
      'tamil nadu': 'TN',
      'telangana': 'TS',
      'andhra pradesh': 'AP',
      'kerala': 'KL',
      'rajasthan': 'RJ',
      'uttar pradesh': 'UP',
      'madhya pradesh': 'MP',
      'west bengal': 'WB',
      'bihar': 'BR',
      'odisha': 'OR',
      'punjab': 'PB',
      'haryana': 'HR',
      'delhi': 'DL'
    };
    return stateAbbreviations[state.toLowerCase()] || abbreviateText(state, 2);
  };

  const abbreviateCountry = (country) => {
    if (!country) return 'N/A';
    const countryAbbreviations = {
      'india': 'IN',
      'united states': 'US',
      'united kingdom': 'UK',
      'canada': 'CA',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR'
    };
    return countryAbbreviations[country.toLowerCase()] || abbreviateText(country, 2);
  };
  useEffect(() => {
    
    if (uid) {
      console.log("The currently active user's UID is:", uid);
   
    }
  }, [uid]);

  // Restrict keyboard shortcuts and prevent copying/pasting/screenshots
  useEffect(() => {
    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      // Block Ctrl/Cmd + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + X (Cut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + Shift + I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl/Cmd + U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Block Print Screen key (standalone and with modifiers)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        // Clear clipboard when PrintScreen is attempted
        navigator.clipboard.writeText('').catch(() => {});
        // Blur the window briefly to prevent screenshot
        document.body.style.visibility = 'hidden';
        setTimeout(() => {
          document.body.style.visibility = 'visible';
        }, 100);
        return false;
      }
      // Block Windows + PrintScreen (Windows Screenshot to file)
      if (e.metaKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) {
        e.preventDefault();
        navigator.clipboard.writeText('').catch(() => {});
        document.body.style.visibility = 'hidden';
        setTimeout(() => {
          document.body.style.visibility = 'visible';
        }, 100);
        return false;
      }
      // Block Windows + Shift + S (Windows Screenshot)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent copy event
    const handleCopy = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent cut event
    const handleCut = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent paste event
    const handlePaste = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent text selection via drag
    const handleSelectStart = (e) => {
      // Allow selection in input/textarea for usability
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Prevent drag events
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Load status colors from Firebase
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setIsRefreshing(false);
  // Restore scroll position after a manual refresh
  const savedScrollPos = sessionStorage.getItem('clientManualScrollPos');
  if (savedScrollPos && tableContainerRef.current) {
    tableContainerRef.current.scrollTop = parseInt(savedScrollPos, 10);
    sessionStorage.removeItem('clientManualScrollPos'); // Clean up
  }
  const didRefresh = sessionStorage.getItem('didClientManualRefresh');
    if (didRefresh) {
      sessionStorage.removeItem('didClientManualRefresh'); // Clear the flag
      setShowRefreshToast(true); // Show the toast
      
      // Hide the toast after 3 seconds
      setTimeout(() => {
        setShowRefreshToast(false);
      }, 3000);
    }
}, [filteredClients]);

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    // First, fetch user's State/City/BusinessName/IndustryType permissions
    const rolesRef = ref(database, 'Admin/Role/StateAdmin');
    onValue(rolesRef, (rolesSnapshot) => {
      const rolesData = rolesSnapshot.val() || {};
      
      // Extract allowed State+City combinations for this user
      const allowedCities = {}; // { "StateName": { "CityName": true } }
      const statesData = rolesData.State || {};
      for (const stateName in statesData) {
        const citiesData = statesData[stateName].City || {};
        for (const cityName in citiesData) {
          if (citiesData[cityName][user.uid]) {
            if (!allowedCities[stateName]) allowedCities[stateName] = {};
            allowedCities[stateName][cityName] = true;
          }
        }
      }

      // Extract allowed Business Names for this user
      const allowedBusinessNames = {};
      const businessData = rolesData.BusinessName || {};
      for (const businessName in businessData) {
        if (businessData[businessName][user.uid]) {
          allowedBusinessNames[businessName] = true;
        }
      }

      // Extract allowed Industry Types (Verticals) for this user
      const allowedIndustryTypes = {};
      const industryData = rolesData.IndustryType || {};
      for (const industryType in industryData) {
        if (industryData[industryType][user.uid]) {
          allowedIndustryTypes[industryType] = true;
        }
      }

      const hasStateCityPerms = Object.keys(allowedCities).length > 0;
      const hasBusinessPerms = Object.keys(allowedBusinessNames).length > 0;
      const hasIndustryPerms = Object.keys(allowedIndustryTypes).length > 0;

      // Fetch assigned clients for this user
      const userRef = ref(database, `User/${user.uid}`);
      onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const assignedClientIds = Object.keys(snapshot.val());
          
          // Fetch client details
          const clientsRef = ref(database, 'User/ClientDetails');
          onValue(clientsRef, (clientSnapshot) => {
            if (clientSnapshot.exists()) {
              const allClients = Object.entries(clientSnapshot.val()).map(([id, data]) => ({
                id,
                ...data
              }));
              
              // Filter only assigned clients that also match the user's State/City/Business/Industry permissions
              const userClients = allClients.filter(client => {
                // First check: client must be in the user's assigned list
                if (!assignedClientIds.includes(client.id)) return false;

                // Check State + City permission (client's state AND city must be in allowed list)
                const stateCityMet = !hasStateCityPerms || 
                  (allowedCities[client.state] && allowedCities[client.state][client.city]);

                // Check Business Name permission
                const businessMet = !hasBusinessPerms || allowedBusinessNames[client.businessName];

                // Check Industry Type permission
                const industryMet = !hasIndustryPerms || allowedIndustryTypes[client.industryType];

                // Client must satisfy ALL applicable permission criteria
                return stateCityMet && businessMet && industryMet;
              });

              setAssignedClients(userClients);
              setFilteredClients(userClients);
            }
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      });
    });

    // Fetch filter options
    const statesRef = ref(database, 'Admin/State');
    onValue(statesRef, (snapshot) => {
      if (snapshot.exists()) {
        setStatesOptions(snapshot.val());
      }
    });

    const businessRef = ref(database, 'Admin/BusinessName');
    onValue(businessRef, (snapshot) => {
      if (snapshot.exists()) {
        setBusinessNamesOptions(Object.keys(snapshot.val()));
      }
    });

    const verticalsRef = ref(database, 'Admin/IndustryType');
    onValue(verticalsRef, (snapshot) => {
      if (snapshot.exists()) {
        setVerticalsOptions(Object.keys(snapshot.val()));
      }
    });
  }, [refreshTrigger]);

  // PERFORMANCE OPTIMIZATION: Apply filters with debounced search and memoized filtering
  // Track previous filter values to detect actual filter changes vs data updates
  const prevFiltersRef = useRef({ selectedBusiness: '', selectedVertical: '', selectedState: '', selectedCity: '', debouncedSearchTerm: '', selectedDate: '', selectedStatus: '' });

  useEffect(() => {
    let filtered = assignedClients;

    // Apply search first across ALL clients and all fields (using debounced search term)
    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        // Safely get contact details
        const details = client.ContactPersonDetails || {};
        const contactKey = Object.keys(details).find(key => key !== 'comment');
        const contact = contactKey ? details[contactKey] || {} : {};
        
        // Get all comment messages - limit to last 10 for performance
        const commentsNode = details.comment || {};
        const commentMessages = Object.values(commentsNode)
          .flatMap(Object.values)
          .slice(0, 10) // Limit comment search for performance
          .map(comment => comment.commentmsg);

        // Combine all searchable fields
        const fieldsToSearch = [
          client.clientName, client.businessName, client.city, client.state,
          contact.contactPerson, contact.designation, contact.emailId, contact.phoneNumber,
          ...commentMessages
        ];

        return fieldsToSearch.some(field =>
          typeof field === 'string' && field.toLowerCase().includes(lowercasedTerm)
        );
      });
    } else {
      // Otherwise, apply dropdown and date filters
      if (selectedBusiness) {
        filtered = filtered.filter(client => client.businessName === selectedBusiness);
      }
      if (selectedVertical) {
        filtered = filtered.filter(client => client.industryType === selectedVertical);
      }
      if (selectedState) {
        filtered = filtered.filter(client => client.state === selectedState);
      }
      if (selectedCity) {
        filtered = filtered.filter(client => client.city === selectedCity);
      }
      // Add the date filter logic
      if (selectedDate) {
        filtered = filtered.filter(client => {
          const details = client.ContactPersonDetails || {};
          const commentsNode = details.comment || {};
          if (!commentsNode) return false;

          const allComments = Object.values(commentsNode).flatMap(Object.values);

          return allComments.some(comment => {
            if (!comment.createdDate) return false;
            const dateObj = new Date(comment.createdDate);
            if (isNaN(dateObj.getTime())) return false; // Safety check
            
            const commentDate = dateObj.toISOString().split('T')[0];
            return commentDate === selectedDate;
          });
        });
      }
    }

    // Status Filter - applies regardless of search term
    if (selectedStatus) {
      filtered = filtered.filter(client => client.status?.value === selectedStatus);
    }

    setFilteredClients(filtered);
    
    // Check if any actual filter changed (not just data)
    const filtersChanged = 
      prevFiltersRef.current.selectedBusiness !== selectedBusiness ||
      prevFiltersRef.current.selectedVertical !== selectedVertical ||
      prevFiltersRef.current.selectedState !== selectedState ||
      prevFiltersRef.current.selectedCity !== selectedCity ||
      prevFiltersRef.current.debouncedSearchTerm !== debouncedSearchTerm ||
      prevFiltersRef.current.selectedDate !== selectedDate ||
      prevFiltersRef.current.selectedStatus !== selectedStatus;
    
    // Only reset pagination if filters actually changed
    if (filtersChanged) {
      pagination.resetPagination();
      prevFiltersRef.current = { selectedBusiness, selectedVertical, selectedState, selectedCity, debouncedSearchTerm, selectedDate, selectedStatus };
    }
  }, [assignedClients, selectedBusiness, selectedVertical, selectedState, selectedCity, debouncedSearchTerm, selectedDate, selectedStatus]);

  const handleOpenModal = useCallback((type, client) => {
    setModalState({ type, client });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ type: null, client: null });
    setCommentText('');
    setConcernText('');
    setMeetingDetails({ date: '', time: '', topic: '' });
  }, []);

  // PERFORMANCE OPTIMIZATION: Optimized comment handler that only updates the specific client
  const handleAddComment = useCallback(() => {
    if (!commentText) return;
    const { client } = modalState;
    if (!client?.ContactPersonDetails) return;

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
            // PERFORMANCE OPTIMIZATION: Use functional update to avoid stale closures
            // and update both states in a single batch
            const updateClientWithComment = (c) => {
                if (c.id !== client.id) return c;
                return {
                    ...c,
                    ContactPersonDetails: {
                        ...c.ContactPersonDetails,
                        comment: {
                            ...(c.ContactPersonDetails?.comment || {}),
                            [firstPushKey]: {
                                ...(c.ContactPersonDetails?.comment?.[firstPushKey] || {}),
                                [secondPushKey]: newComment
                            }
                        }
                    }
                };
            };

            // Skip pagination reset when only updating comment data
            skipPaginationResetRef.current = true;
            setAssignedClients(prev => prev.map(updateClientWithComment));
            setFilteredClients(prev => prev.map(updateClientWithComment));
            setCommentText('');
            handleCloseModal();
        })
        .catch(err => alert("Error: " + err.message));
  }, [commentText, modalState, handleCloseModal]);

  const handleAddConcern = () => {
    if (!concernText) return;
    const { client } = modalState;
    
    const concernsRef = ref(database, `/User/ClientDetails/${client.id}/concerns`);
    const newConcernRef = push(concernsRef);
    const newConcern = {
        concernText: concernText,
        createdDate: new Date().toISOString(),
        reportedBy: getAuth().currentUser.email,
        status: 'Open'
    };
    
    set(newConcernRef, newConcern)
        .then(() => {
            alert("Concern added successfully!");
            setConcernText('');
            handleCloseModal();
        })
        .catch(err => alert("Error adding concern: " + err.message));
  };

  // Handle work status update - saves to User/ClientDetails/{clientId}/status
  const handleUpdateWorkStatus = useCallback((clientId, newStatus) => {
    const user = getAuth().currentUser;
    if (!user) {
      alert("You must be logged in to update status");
      return;
    }

    console.log("Updating status for client:", clientId, "to:", newStatus);

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

    console.log("Status data to save:", statusData);
    console.log("Firebase path:", `User/ClientDetails/${clientId}/status`);

    // Use update with full path for more reliable write
    const updates = {};
    updates[`User/ClientDetails/${clientId}/status`] = statusData;
    
    update(ref(database), updates)
      .then(() => {
        console.log("Status saved successfully to Firebase!");
        // Update local state
        const updateClientStatus = (c) => {
          if (c.id !== clientId) return c;
          return { ...c, status: statusData };
        };
        setAssignedClients(prev => prev.map(updateClientStatus));
        setFilteredClients(prev => prev.map(updateClientStatus));
        setActiveStatusDropdown(null);
      })
      .catch(err => {
        console.error("Error saving status:", err);
        alert("Error updating status: " + err.message);
      });
  }, [workStatusOptions]);

  // Get status color for a client
  const getStatusColor = (client) => {
    // First check if client has a saved status with color
    if (client.status?.color) {
      return client.status.color;
    }
    // Fallback to matching by value
    const statusValue = client.status?.value || 'no-call';
    const statusOption = workStatusOptions.find(opt => opt.value === statusValue);
    return statusOption ? statusOption.color : '#000000';
  };

  // Get status label for a client
  const getStatusLabel = (client) => {
    // First check if client has a saved status with label
    if (client.status?.label) {
      return client.status.label;
    }
    // Fallback to matching by value
    const statusValue = client.status?.value || 'no-call';
    const statusOption = workStatusOptions.find(opt => opt.value === statusValue);
    return statusOption ? statusOption.label : 'No Call';
  };

  // Get current status value for a client
  const getStatusValue = (client) => {
    return client.status?.value || 'no-call';
  };

  const handleSetMeeting = () => {
    if (!meetingDetails.date || !meetingDetails.topic) return;
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
        alert("Meeting scheduled successfully!");
        handleCloseModal();
      })
      .catch(err => alert("Error setting meeting: " + err.message));
  };

  // PERFORMANCE OPTIMIZATION: Memoized client selection handler
  const handleSelectClient = useCallback((client) => {
    setSelectedClients(prev => {
      const newSelected = { ...prev };
      if (newSelected[client.id]) {
        delete newSelected[client.id];
      } else {
        newSelected[client.id] = true;
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
          newSelected[client.id] = true;
        } else {
          delete newSelected[client.id];
        }
      });
      return newSelected;
    });
  }, [pagination.paginatedData]);

  // Fixed filter handlers with forced re-render to ensure dropdown works after no results
  const handleBusinessChange = (value) => {
    setSelectedBusiness(value);
  };

  const handleVerticalChange = (value) => {
    setSelectedVertical(value);
  };

  const handleStateChange = (value) => {
    setSelectedState(value);
    if (value !== selectedState) {
      setSelectedCity(''); // Reset city when state changes
    }
  };

  const handleCityChange = (value) => {
    setSelectedCity(value);
  };
  
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

  // Function to render enhanced tooltip content
  const renderTooltip = (comments, type) => {
    if (comments.length <= 1) return null;
    
    const previousComments = comments.slice(1); // Skip the first (latest) comment
    
    return (
      <div className="position-absolute bg-white border rounded-3 shadow-lg p-3" 
           style={{ 
             zIndex: 1050, 
             minWidth: '320px', 
             maxWidth: '450px',
             fontSize: '0.85rem',
             top: '-15px',
             left: '50%',
             transform: 'translateX(-50%)',
             maxHeight: '300px',
             overflowY: 'auto',
             border: '2px solid #e9ecef'
           }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
          <div className="fw-bold text-primary" style={{ fontSize: '0.9rem' }}>
            <i className={`fas fa-${type === 'date' ? 'calendar' : 'comments'} me-2`}></i>
            Previous {type === 'date' ? 'Dates' : 'Discussions'} ({previousComments.length})
          </div>
          <small className="text-muted">{type === 'date' ? 'Chronological Order' : 'Latest First'}</small>
        </div>
        
        {/* Content */}
        <div className="previous-comments-list">
          {previousComments.map((comment, index) => (
            <div key={index} className="mb-3 p-2 rounded" 
                 style={{ 
                   backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                   border: '1px solid #e9ecef'
                 }}>
              {type === 'date' ? (
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                      {new Date(comment.createdDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(comment.createdDate).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-user me-1"></i>
                    {comment.writtenBy?.split('@')[0] || 'Unknown'}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Discussion Header */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-calendar me-1"></i>
                      {new Date(comment.createdDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: '2-digit'
                      })} at {new Date(comment.createdDate).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-user me-1"></i>
                      {comment.writtenBy?.split('@')[0] || 'Unknown'}
                    </div>
                  </div>
                  
                  {/* Discussion Content */}
                  <div className="text-dark" style={{ 
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}>
                    <i className="fas fa-quote-left me-2 text-muted" style={{ fontSize: '0.75rem' }}></i>
                    {comment.commentmsg}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="text-center pt-2 border-top">
          <small className="text-muted">
            <i className="fas fa-info-circle me-1"></i>
            Hover away to close
          </small>
        </div>
      </div>
    );
  };

  // Function to render abbreviation tooltip
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

  if (isLoading) return <div>Loading...</div>;

  const filterCities = selectedState ? Object.keys(statesOptions[selectedState] || {}) : [];

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
            zIndex: 2000,
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
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

     <div className="table-section mb-4">
        {/* Status Legend with Color Pickers */}
        <div className="status-legend">
          <span style={{ fontWeight: '600', marginRight: '10px' }}>Status:</span>
          {workStatusOptions.map(option => (
            <div key={option.value} className="status-legend-item" style={{ position: 'relative' }}>
              <span 
                className="status-legend-dot" 
                style={{ 
                  backgroundColor: option.color, 
                  cursor: 'pointer',
                  border: colorPickerStatus === option.value ? '2px solid #0d6efd' : '1px solid #ccc'
                }}
                onClick={() => setColorPickerStatus(colorPickerStatus === option.value ? null : option.value)}
                title="Click to change color"
              ></span>
              <span>{option.label}</span>
              {colorPickerStatus === option.value && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    zIndex: 1050,
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '10px',
                    marginTop: '5px'
                  }}
                >
                  <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: '600' }}>
                    Choose color for "{option.label}"
                  </div>
                  <input 
                    type="color" 
                    value={option.color}
                    onChange={(e) => handleStatusColorChange(option.value, e.target.value)}
                    style={{ 
                      width: '50px', 
                      height: '30px', 
                      cursor: 'pointer',
                      border: 'none',
                      padding: '0'
                    }}
                  />
                  <button 
                    className="btn btn-sm btn-outline-secondary ms-2"
                    onClick={() => setColorPickerStatus(null)}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="mb-0">My Assigned Clients ({filteredClients.length})</h5>
          
          {/* This single div now holds both buttons */}
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

            {/* --- ADD THIS BUTTON BACK --- */}
            <button className="btn btn-outline-primary" onClick={() => setShowTable(prev => !prev)}>
              <i className={`fas fa-${showTable ? 'eye-slash' : 'eye'} me-2`}></i>
              {showTable ? 'Hide Table' : 'Show Table'}
            </button>
            {/* --- END OF FIX --- */}
            
          </div>
        </div>
        {showTable && (
        <div 
          className="table-wrapper rounded-3 shadow-sm"
          ref={tableContainerRef} // <-- THIS IS THE FIX
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
          onClick={() => setActiveStatusDropdown(null)} // Close status dropdown when clicking table
        >
          <table className="table table-hover mb-0" style={{ width: '100%', fontSize: '0.8rem', tableLayout: 'fixed' }}>
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '2%' }}></th>
                  <th style={{ width: '4%', textAlign: 'center' }}>
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
                  <th style={{ width: '6%' }}>Business<select className="form-select form-select-sm" value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)}><option value="">All</option>{businessNamesOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                  <th style={{ width: '6%' }}>Vertical<select className="form-select form-select-sm" value={selectedVertical} onChange={e => setSelectedVertical(e.target.value)}><option value="">All</option>{verticalsOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                  <th style={{ width: '14%' }}>Client Name</th>
                  <th style={{ width: '4%' }}>Country</th>
                  <th style={{ width: '4%' }}>State<select className="form-select form-select-sm" value={selectedState} onChange={e => handleStateChange(e.target.value)}><option value="">All</option>{Object.keys(statesOptions).map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                  <th style={{ width: '6%' }}>City<select className="form-select form-select-sm" value={selectedCity} onChange={e => handleCityChange(e.target.value)} disabled={!selectedState}><option value="">All</option>{filterCities.map(o => <option key={o} value={o}>{o}</option>)}</select></th>
                  <th style={{ width: '8%' }}>Contact</th>
                  <th style={{ width: '8%' }}>Designation</th>
                  <th style={{ width: '8%' }}>Phone</th>
                  <th style={{ width: '10%' }}>Email</th>
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
                {/* PERFORMANCE OPTIMIZATION: Render only paginated data, not all filtered clients */}
                {pagination.paginatedData.map(client => {
                  const contactDetails = client.ContactPersonDetails || {};
                  const contactKey = Object.keys(contactDetails).find(key => key !== 'comment');
                  const contact = contactKey ? contactDetails[contactKey] : {};
                  const commentsNode = contactDetails.comment || {};
                  const allComments = Object.values(commentsNode)
                    .flatMap(firstLevel => Object.values(firstLevel))
                    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
                  const latestComment = allComments.length > 0 ? allComments[0] : null;

                  return (
                    <React.Fragment key={client.id}>
                      <tr key={client.id} className={selectedClients[client.id] ? 'selected-row' : ''}>
                        <td style={{ width: '2%', padding: '4px' }}>
                          <div className="form-check">
                            <input 
                              type="checkbox" 
                              className="form-check-input"
                              checked={!!selectedClients[client.id]} 
                              onChange={() => handleSelectClient(client)}
                            />
                          </div>
                        </td>
                        
                        {/* Work Status Column */}
                        <td style={{ width: '4%', padding: '4px', position: 'relative', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div 
                            className="work-status-indicator"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusDropdown(activeStatusDropdown === client.id ? null : client.id);
                            }}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: getStatusColor(client),
                              margin: '0 auto',
                              cursor: 'pointer',
                              border: '2px solid #fff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              transition: 'transform 0.2s'
                            }}
                            title={`Click to change status (Current: ${getStatusLabel(client)})`}
                          />
                          {activeStatusDropdown === client.id && (
                            <div 
                              className="status-dropdown"
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
                                minWidth: '140px'
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
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = getStatusValue(client) === option.value ? '#e3f2fd' : 'transparent'}
                                >
                                  <span
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: option.color,
                                      marginRight: '8px',
                                      border: getStatusValue(client) === option.value ? '2px solid #0d6efd' : '1px solid #ccc'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: '#333', fontWeight: getStatusValue(client) === option.value ? '600' : 'normal' }}>{option.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        
                        {/* Business Column with Abbreviation Tooltip */}
                        <td 
                          style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
                          onMouseEnter={() => setHoveredCell({ row: client.id, column: 'business' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {abbreviateBusiness(client.businessName)}
                          {hoveredCell.row === client.id && hoveredCell.column === 'business' && client.businessName && (
                            renderAbbreviationTooltip(abbreviateBusiness(client.businessName), client.businessName)
                          )}
                        </td>
                        
                        {/* Vertical Column with Abbreviation Tooltip */}
                        <td 
                          style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
                          onMouseEnter={() => setHoveredCell({ row: client.id, column: 'vertical' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {abbreviateVertical(client.industryType)}
                          {hoveredCell.row === client.id && hoveredCell.column === 'vertical' && client.industryType && (
                            renderAbbreviationTooltip(abbreviateVertical(client.industryType), client.industryType)
                          )}
                        </td>
                        
                        <td style={{ width: '14%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {client.clientName || 'N/A'}
                        </td>
                        
                        {/* Country Column with Abbreviation Tooltip */}
                        <td 
                          style={{ width: '4%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
                          onMouseEnter={() => setHoveredCell({ row: client.id, column: 'country' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {abbreviateCountry(client.country)}
                          {hoveredCell.row === client.id && hoveredCell.column === 'country' && client.country && (
                            renderAbbreviationTooltip(abbreviateCountry(client.country), client.country)
                          )}
                        </td>
                        
                        {/* State Column with Abbreviation Tooltip */}
                        <td 
                          style={{ width: '4%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px', position: 'relative', cursor: 'help' }}
                          onMouseEnter={() => setHoveredCell({ row: client.id, column: 'state' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {abbreviateState(client.state)}
                          {hoveredCell.row === client.id && hoveredCell.column === 'state' && client.state && (
                            renderAbbreviationTooltip(abbreviateState(client.state), client.state)
                          )}
                        </td>
                        
                        <td style={{ width: '6%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {client.city || 'N/A'}
                        </td>
                        <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {contact.contactPerson || 'N/A'}
                        </td>
                        <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {contact.designation || 'N/A'}
                        </td>
                        <td style={{ width: '8%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {contact.phoneNumber || 'N/A'}
                        </td>
                        <td style={{ width: '10%', wordWrap: 'break-word', fontSize: '0.75rem', padding: '4px' }}>
                          {contact.emailId || 'N/A'}
                        </td>
                        
                        {/* Latest Date Column with Enhanced Hover */}
                        <td 
                          style={{ 
                            width: '10%', 
                            wordWrap: 'break-word', 
                            fontSize: '0.75rem', 
                            padding: '4px',
                            position: 'relative',
                            cursor: allComments.length > 1 ? 'pointer' : 'default',
                            backgroundColor: allComments.length > 1 ? '#f8f9fa' : 'transparent'
                          }}
                          onMouseEnter={() => allComments.length > 1 && setHoveredCell({ row: client.id, column: 'date' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {latestComment ? (
                            <div>
                              <div className="fw-semibold">{new Date(latestComment.createdDate).toLocaleDateString()}</div>
                              <div style={{ fontSize: '0.65rem', color: '#666' }}>
                                {new Date(latestComment.createdDate).toLocaleTimeString()}
                              </div>
                              {allComments.length > 1 && (
                                <small className="text-primary">
                                  <i className="fas fa-layer-group me-1"></i>
                                  +{allComments.length - 1} more
                                </small>
                              )}
                            </div>
                          ) : 'No dates'}
                          
                          {hoveredCell.row === client.id && hoveredCell.column === 'date' && (
                            renderTooltip(allComments, 'date')
                          )}
                        </td>

                        {/* Latest Discussion Column with Enhanced Hover */}
                        <td 
                          style={{ 
                            width: '12%', 
                            wordWrap: 'break-word', 
                            fontSize: '0.75rem', 
                            padding: '4px',
                            position: 'relative',
                            cursor: allComments.length > 1 ? 'pointer' : 'default',
                            backgroundColor: allComments.length > 1 ? '#f8f9fa' : 'transparent'
                          }}
                          onMouseEnter={() => allComments.length > 1 && setHoveredCell({ row: client.id, column: 'discussion' })}
                          onMouseLeave={() => setHoveredCell({ row: null, column: null })}
                        >
                          {latestComment ? (
                            <div>
                              <div style={{ 
                                maxHeight: '35px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: '1.2'
                              }}>
                                {latestComment.commentmsg}
                              </div>
                              {allComments.length > 1 && (
                                <small className="text-primary">
                                  <i className="fas fa-comments me-1"></i>
                                  +{allComments.length - 1} more
                                </small>
                              )}
                            </div>
                          ) : 'No discussions'}
                          
                          {hoveredCell.row === client.id && hoveredCell.column === 'discussion' && (
                            renderTooltip(allComments, 'discussion')
                          )}
                        </td>

                        {/* Actions Column - Grid Layout with 2x2 buttons */}
<td className="text-center p-2">
  <div 
    className="actions-grid" 
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '3px',
      width: '80px',
      margin: '0 auto'
    }}
  >
    {/* Top Row */}
    <button 
      className="btn btn-sm btn-outline-info" 
      onClick={() => handleOpenModal('addComment', client)} 
      title="Add Comment"
      style={{
        padding: '4px',
        fontSize: '11px',
        borderRadius: '4px',
        minHeight: '28px'
      }}
    >
      <i className="fas fa-comment"></i>
    </button>
    
     <button 
                                  className="btn btn-sm btn-light" 
                                  onClick={() => handleAddClientFromTemplate(client)} 
                                  title="Add New Client from Template"
                                     style={{
                                        padding: '4px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                         minHeight: '28px'
                                    }}
                                >
                                  <i className="fas fa-plus-square text-success"></i>
                                </button>
    
    {/* Bottom Row */}
    <button 
      className="btn btn-sm btn-outline-primary" 
      onClick={() => handleOpenModal('setMeeting', client)} 
      title="Set Meeting"
      style={{
        padding: '4px',
        fontSize: '11px',
        borderRadius: '4px',
        minHeight: '28px'
      }}
    >
      <i className="fas fa-calendar-alt"></i>
    </button>
    
    <button 
      className="btn btn-sm btn-success" 
      onClick={() => openWhatsAppChatForClient(client, contact)} 
      title="WhatsApp"
      style={{
        padding: '4px',
        fontSize: '11px',
        borderRadius: '4px',
        minHeight: '28px'
      }}
    >
      <i className="fab fa-whatsapp"></i>
    </button>
  </div>
</td>
                          </tr>
                          
                          {/* --- This conditionally renders the NEW CLIENT ROW underneath --- */}
                          {newClientAfterId === client.id && newClientRecord && (
                            <tr className="table-info">
                              <td><i className="fas fa-level-up-alt fa-rotate-90 text-primary ms-2"></i></td>
                              <td>-</td>
                              <td>{abbreviateBusiness(newClientRecord.businessName)}</td>
                              <td>{abbreviateVertical(newClientRecord.industryType)}</td>
                              <td><input type="text" className="form-control form-control-sm" name="clientName" value={newClientRecord.clientName} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="New Client Name" /></td>
                              <td>{abbreviateCountry(newClientRecord.country)}</td>
                              <td>{abbreviateState(newClientRecord.state)}</td>
                              <td>{newClientRecord.city}</td>
                              <td><input type="text" className="form-control form-control-sm" name="contactPerson" value={newClientRecord.ContactPersonDetails.contactPerson} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Contact Person" /></td>
                              <td><input type="text" className="form-control form-control-sm" name="designation" value={newClientRecord.ContactPersonDetails.designation} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Designation" /></td>
                              <td><input type="text" className="form-control form-control-sm" name="phoneNumber" value={newClientRecord.ContactPersonDetails.phoneNumber} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Phone Number" /></td>
                              <td><input type="email" className="form-control form-control-sm" name="emailId" value={newClientRecord.ContactPersonDetails.emailId} onChange={handleNewClientInputChange} onKeyDown={handleSaveNewClient} placeholder="Email" /></td>
                              <td colSpan="3">Press Enter to save...</td>
                            </tr>
                          )}
                        </React.Fragment>
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

export default MyClients;